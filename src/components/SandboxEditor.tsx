/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import CodeEditor from "@/components/CodeEditor";
import PreviewSurface from "@/components/PreviewSurface";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FONT_OPTIONS } from "@/constants";
import { api } from "@/lib/api";
import { parseJsxToTree } from "@/lib/serializer";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Clipboard,
  Code2,
  Copy,
  Eye,
  Lock,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

type SandboxEditorProps = {
  id: string;
  initialSource?: string;
  initialName?: string;
  initialDescription?: string;
};

type Overrides = Record<
  string,
  {
    style?: Record<string, string | number>;
    text?: string;
  }
>;

const OVERRIDES_TAG = "@reframe-overrides";

export default function SandboxEditor({
  id,
  initialSource,
  initialName,
  initialDescription,
}: SandboxEditorProps) {
  const [code, setCode] = useState<string>(() => initialSource || DEFAULT_SNIPPET);
  const [name, setName] = useState<string>(initialName || "");
  const [description, setDescription] = useState<string>(initialDescription || "");
  const [status, setStatus] = useState<string>("Auto-saving");
  const [instanceKey, setInstanceKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"ui" | "code">("ui");
  const [overridesRevision, setOverridesRevision] = useState<number>(0);
  const [previewRevision, setPreviewRevision] = useState<number>(0);
  const [previewKey, setPreviewKey] = useState<number>(0);

  // Preview + selection
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const overridesRef = useRef<Overrides>({});
  const [history, setHistory] = useState<Overrides[]>([]);
  const [future, setFuture] = useState<Overrides[]>([]);
  const dragStartMarginsRef = useRef<{ marginLeft: number; marginTop: number } | null>(null);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [leftWidth, setLeftWidth] = useState<number>(0);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isSplitLocked, setIsSplitLocked] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile" | "custom">(
    "desktop"
  );
  const [customPreviewWidth, setCustomPreviewWidth] = useState<number>(1280);
  const [customPreviewHeight, setCustomPreviewHeight] = useState<number>(800);
  useEffect(() => {
    const update = () => {
      const el = splitRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (leftWidth <= 0) {
        setLeftWidth(Math.round(w * 0.75));
        return;
      }
      const desired = Math.min(Math.max(leftWidth, 320), Math.max(320, w - 320));
      if (desired !== leftWidth) setLeftWidth(desired);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [leftWidth]);
  const onSplitPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSplitLocked) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = leftWidth;
      setIsDraggingSplit(true);
      const onMove = (ev: PointerEvent) => {
        const root = splitRef.current;
        if (!root) return;
        const total = root.getBoundingClientRect().width;
        const dx = ev.clientX - startX;
        const next = Math.min(Math.max(startWidth + dx, 320), Math.max(320, total - 320));
        setLeftWidth(next);
      };
      const onUp = () => {
        setIsDraggingSplit(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    },
    [leftWidth, isSplitLocked]
  );

  const handleResetSplit = useCallback(() => {
    const root = splitRef.current;
    if (!root) return;
    const total = root.getBoundingClientRect().width;
    setLeftWidth(Math.round(total * 0.75));
  }, []);

  const getPreviewSize = useCallback((): { width: number; height?: number } => {
    switch (previewDevice) {
      case "mobile":
        return { width: 375, height: 667 };
      case "tablet":
        return { width: 768, height: 1024 };
      case "desktop":
        return { width: 1280, height: 800 };
      case "custom":
      default:
        return {
          width: Math.max(240, customPreviewWidth),
          height: Math.max(320, customPreviewHeight),
        };
    }
  }, [previewDevice, customPreviewWidth, customPreviewHeight]);

  // Capture rendered HTML and CSS from the shadow root for export
  const buildPreviewExportTsx = useCallback(() => {
    const root = shadowRootRef.current as any as ShadowRoot | null;
    if (!root) return null;
    // Gather CSS from adoptedStyleSheets and <style> tags
    const cssParts: string[] = [];
    try {
      const sheets = (root as any).adoptedStyleSheets as CSSStyleSheet[] | undefined;
      if (sheets && Array.isArray(sheets)) {
        for (const sheet of sheets) {
          try {
            const rules = Array.from((sheet as any).cssRules || []) as CSSRule[];
            cssParts.push(rules.map((r) => r.cssText).join("\n"));
          } catch {}
        }
      }
    } catch {}
    try {
      const styleTags = Array.from(root.querySelectorAll("style")) as HTMLStyleElement[];
      for (const s of styleTags) cssParts.push(s.textContent || "");
    } catch {}

    // Capture HTML (excluding style/link tags) from the preview mount
    const mount = root.querySelector('div[data-preview-mount="1"]') as HTMLDivElement | null;
    if (!mount) return null;
    const clone = mount.cloneNode(true) as HTMLDivElement;
    try {
      clone
        .querySelectorAll('style,link[rel="stylesheet"]')
        .forEach((n) => n.parentElement?.removeChild(n));
    } catch {}
    const html = clone.innerHTML;
    const css = cssParts.join("\n\n");

    const componentName = (name || "Component").replace(/\s+/g, "").replace(/[^A-Za-z0-9_]/g, "");
    const tsx = `export default function ${componentName}() {\n  return (\n    <div>\n      <style>{${JSON.stringify(css)}}</style>\n      <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />\n    </div>\n  );\n}`;
    return tsx;
  }, [name]);

  // Persist undo/redo stacks across reloads per component id
  useEffect(() => {
    try {
      const h = sessionStorage.getItem(`reframe:history:${id}`);
      const f = sessionStorage.getItem(`reframe:future:${id}`);
      if (h) setHistory(JSON.parse(h));
      if (f) setFuture(JSON.parse(f));
    } catch {}
  }, [id]);
  useEffect(() => {
    try {
      sessionStorage.setItem(`reframe:history:${id}`, JSON.stringify(history));
      sessionStorage.setItem(`reframe:future:${id}`, JSON.stringify(future));
    } catch {}
  }, [history, future, id]);

  // Parse overrides embedded in code
  useEffect(() => {
    overridesRef.current = extractOverrides(code);
    try {
      const h = extractHistory(code);
      if (h) {
        setHistory(Array.isArray(h.history) ? h.history : []);
        setFuture(Array.isArray(h.future) ? h.future : []);
      }
    } catch {}
  }, []);

  const cloneOverrides = useCallback((src: Overrides): Overrides => {
    try {
      return JSON.parse(JSON.stringify(src || {}));
    } catch {
      return {};
    }
  }, []);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, cloneOverrides(overridesRef.current)]);
    setFuture([]);
  }, [cloneOverrides]);

  const applySnapshot = useCallback(
    (snap: Overrides) => {
      overridesRef.current = cloneOverrides(snap);
      setOverridesRevision((r) => r + 1);
      setPreviewRevision((r) => r + 1);
    },
    [cloneOverrides]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setFuture((f) => [cloneOverrides(overridesRef.current), ...f]);
      applySnapshot(last);
      return prev.slice(0, -1);
    });
  }, [applySnapshot, cloneOverrides]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const next = prev[0];
      setHistory((h) => [...h, cloneOverrides(overridesRef.current)]);
      applySnapshot(next);
      return prev.slice(1);
    });
  }, [applySnapshot, cloneOverrides]);

  // Save mutations
  const updateMutation = useMutation({
    mutationFn: (payload: { source: string; tree?: any; name?: string; description?: string }) =>
      api.updateComponent(id, payload),
    onMutate: () => setStatus("Saving…"),
    onSuccess: () => {
      setStatus("Saved ✔");
      setTimeout(() => setStatus("Auto-saving"), 1500);
    },
    onError: () => setStatus("Save failed"),
  });

  // Debounced auto-save on code/name/description/overrides/history changes
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    const t = setTimeout(async () => {
      let sourceToSave = injectOverrides(code, overridesRef.current);
      sourceToSave = injectHistory(sourceToSave, { history, future });
      // Include meta (name/description) in the identity to ensure meta-only edits save
      const saveKey = JSON.stringify({
        source: sourceToSave,
        name: name || undefined,
        description: description || undefined,
      });
      if (saveKey === lastSavedRef.current) return;
      lastSavedRef.current = saveKey;
      let tree: any | undefined;
      try {
        tree = await parseJsxToTree(sourceToSave);
      } catch {}
      updateMutation.mutate({
        source: sourceToSave,
        tree,
        name: name || undefined,
        description: description || undefined,
      });
    }, 900);
    return () => clearTimeout(t);
  }, [code, name, description, overridesRevision, history, future]);

  // Compile + evaluate to component
  const { Component, compileError } = useCompiledComponent(code, overridesRef, setErrorMsg);

  // Keep overrides in sync with the current code. If the user removed the overrides comment,
  // this clears overridesRef so we don't re-inject it on the next autosave.
  useEffect(() => {
    try {
      const extracted = extractOverrides(code);
      const prevJson = JSON.stringify(overridesRef.current || {});
      const nextJson = JSON.stringify(extracted || {});
      if (prevJson !== nextJson) {
        overridesRef.current = extracted;
        setOverridesRevision((r) => r + 1);
      }
    } catch {}
  }, [code]);

  // Ensure the code editor reflects the latest overrides and history immediately when preview changes
  useEffect(() => {
    try {
      let injected = injectOverrides(code, overridesRef.current);
      injected = injectHistory(injected, { history, future });
      if (injected !== code) setCode(injected);
    } catch {}
  }, [overridesRevision, history, future]);

  // Force remount preview on code or overrides changes to reflect updates without reload
  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [code, overridesRevision]);

  // Apply non-CSS overrides (like text) after preview mounts or overrides change
  useEffect(() => {
    if (activeTab !== "ui") return;
    const root = shadowRootRef.current;
    if (!root) return;
    try {
      const entries = Object.entries(overridesRef.current || {});
      for (const [selector, data] of entries) {
        if (!data || typeof (data as any).text !== "string") continue;
        const el = root.querySelector(selector) as HTMLElement | null;
        if (el) el.textContent = (data as any).text as string;
      }
    } catch {}
  }, [overridesRevision, previewKey, activeTab]);

  // Hover/selection handlers inside shadow root (re-bind on preview remount or tab change)
  useEffect(() => {
    const root = shadowRootRef.current;
    if (!root || activeTab !== "ui") return;
    const onMove = (e: Event) => {
      const path = (e as any).composedPath?.() as any[] | undefined;
      const target = path && path[0] ? (path[0] as HTMLElement) : undefined;
      if (!target || !(target instanceof HTMLElement)) {
        setHoverRect(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setHoverRect(rect);
    };
    const onLeave = () => setHoverRect(null);
    const onClick = (e: Event) => {
      const path = (e as any).composedPath?.() as any[] | undefined;
      const target = path && path[0] ? (path[0] as HTMLElement) : undefined;
      if (!target || !(target instanceof HTMLElement)) return;
      try {
        (e as any).preventDefault?.();
        (e as any).stopPropagation?.();
      } catch {}
      const selector = buildUniqueSelector(target, root as any);
      setSelectedSelector(selector);
      setSelectedRect(target.getBoundingClientRect());
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("click", onClick);
    };
  }, [previewRevision, previewKey, activeTab]);

  // Clean selection and shadow root reference when leaving UI tab
  useEffect(() => {
    if (activeTab !== "ui") {
      setHoverRect(null);
      setSelectedRect(null);
      setSelectedSelector(null);
      shadowRootRef.current = null;
    }
  }, [activeTab]);

  // Force remount when switching back to UI for a clean preview
  useEffect(() => {
    if (activeTab === "ui") setPreviewKey((k) => k + 1);
  }, [activeTab]);

  const applyTextChange = useCallback(
    (text: string) => {
      if (!selectedSelector || !shadowRootRef.current) return;
      const root = shadowRootRef.current;
      const el = root.querySelector(selectedSelector) as HTMLElement | null;
      if (!el) return;
      pushHistory();
      el.textContent = text;
      overridesRef.current = {
        ...overridesRef.current,
        [selectedSelector]: { ...(overridesRef.current[selectedSelector] || {}), text },
      };
      // bump revision to trigger UI refresh + autosave
      setPreviewRevision((r) => r + 1);
      setOverridesRevision((r) => r + 1);
    },
    [selectedSelector, pushHistory]
  );

  const applyStyleChange = useCallback(
    (styleKey: string, value: string | number) => {
      if (!selectedSelector || !shadowRootRef.current) return;
      const root = shadowRootRef.current;
      const el = root.querySelector(selectedSelector) as HTMLElement | null;
      if (!el) return;
      try {
        pushHistory();
        (el.style as any)[styleKey] =
          typeof value === "number" && PIXEL_STYLES.has(styleKey) ? `${value}px` : (value as any);
      } catch {}
      const prev = overridesRef.current[selectedSelector]?.style || {};
      overridesRef.current = {
        ...overridesRef.current,
        [selectedSelector]: {
          ...(overridesRef.current[selectedSelector] || {}),
          style: { ...prev, [styleKey]: value },
        },
      };
      setPreviewRevision((r) => r + 1);
      setOverridesRevision((r) => r + 1);
    },
    [selectedSelector, pushHistory]
  );

  const selectedText = useMemo(() => {
    if (!selectedSelector || !shadowRootRef.current) return "";
    const el = shadowRootRef.current.querySelector(selectedSelector) as HTMLElement | null;
    return el?.textContent || "";
  }, [selectedSelector, shadowRootRef.current, instanceKey, previewRevision]);

  const selectedStyle = useMemo(() => {
    const base = overridesRef.current[selectedSelector || ""]?.style || {};
    return base as Record<string, string | number>;
  }, [selectedSelector, overridesRef.current, previewRevision]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "ui") return;
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
      } else if (
        (mod && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (mod && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, undo, redo]);

  return (
    <div ref={splitRef} className="items-start gap-4 xl:flex">
      <section className="space-y-3" style={{ width: leftWidth, flex: "0 0 auto" }}>
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1">
            <span
              className={`h-2 w-2 rounded-full ${status.startsWith("Saved") ? "bg-green-500" : status.includes("fail") ? "bg-red-500" : "bg-red-400"}`}
            />
            <span className="text-xs text-foreground/80">{status}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2">
              <Select value={previewDevice} onValueChange={(v) => setPreviewDevice(v as any)}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Preview device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {previewDevice === "custom" && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="w-20 h-8 rounded-md border bg-background px-2 text-xs"
                    value={customPreviewWidth}
                    onChange={(e) =>
                      setCustomPreviewWidth(Math.max(240, Number(e.target.value || 0)))
                    }
                    placeholder="Width"
                    aria-label="Custom width"
                  />
                  <span className="text-xs text-foreground/60">×</span>
                  <input
                    type="number"
                    className="w-20 h-8 rounded-md border bg-background px-2 text-xs"
                    value={customPreviewHeight}
                    onChange={(e) =>
                      setCustomPreviewHeight(Math.max(320, Number(e.target.value || 0)))
                    }
                    placeholder="Height"
                    aria-label="Custom height"
                  />
                </div>
              )}
            </div>
            <div className="hidden xl:flex items-center gap-1">
              <button
                className="h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center hover:bg-accent"
                onClick={() => setIsSplitLocked((v) => !v)}
                title={isSplitLocked ? "Unlock layout" : "Lock layout"}
                aria-label={isSplitLocked ? "Unlock layout" : "Lock layout"}
              >
                {isSplitLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
              <button
                className={`h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center ${
                  isSplitLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                }`}
                onClick={() => {
                  if (!isSplitLocked) handleResetSplit();
                }}
                title={isSplitLocked ? "Unlock layout to reset" : "Reset to 3:1"}
                aria-label={isSplitLocked ? "Unlock layout to reset" : "Reset to 3:1"}
                disabled={isSplitLocked}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="inline-flex items-center rounded-md border bg-card p-0.5">
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1 ${
                  activeTab === "ui"
                    ? "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                    : "text-foreground/60"
                }`}
                onClick={() => setActiveTab("ui")}
              >
                <Eye className="h-4 w-4" /> UI
              </button>
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1 ${
                  activeTab === "code"
                    ? "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
                    : "text-foreground/60"
                }`}
                onClick={() => setActiveTab("code")}
              >
                <Code2 className="h-4 w-4" /> Code
              </button>
            </div>
            <Button
              variant="outline"
              className="inline-flex items-center gap-1"
              onClick={async () => {
                const cleaned = stripReframeMetadata(code);
                const hasOverrides = Boolean(
                  overridesRef.current && Object.keys(overridesRef.current).length
                );
                const withOverrides = hasOverrides
                  ? buildTsxWithStyleOverrides(cleaned, overridesRef.current, name)
                  : null;
                const toCopy = withOverrides || cleaned;
                await navigator.clipboard.writeText(toCopy);
                toast.success(withOverrides ? "Copied TSX with overrides" : "Copied TSX");
              }}
            >
              <Clipboard className="h-4 w-4" /> Copy TSX
            </Button>
          </div>
        </div>
        {activeTab === "code" && (
          <div className="rounded-xl border overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              fileName={`${(name || "Component").replace(/\s+/g, "")}.tsx`}
            />
          </div>
        )}
        {activeTab === "ui" && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b border-red-900/40">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-200">Live Sandbox</h3>
              {compileError && (
                <span className="text-xs text-red-600 dark:text-red-400">{compileError}</span>
              )}
            </div>
            <div
              ref={containerRef}
              className="relative"
              style={{
                width: Math.min(getPreviewSize().width, (leftWidth || 1200) - 24),
                marginLeft: "auto",
                marginRight: "auto",
                ...(previewDevice === "custom" && getPreviewSize().height
                  ? { height: getPreviewSize().height }
                  : {}),
              }}
            >
              <PreviewSurface onShadowRootReady={(r) => (shadowRootRef.current = r)}>
                <div key={previewKey} className="p-6 min-h-[640px]">
                  {/* Inject overrides style tag */}
                  <style suppressHydrationWarning>{renderOverridesCss(overridesRef.current)}</style>
                  {Component ? (
                    <SandboxMount>
                      <Component />
                    </SandboxMount>
                  ) : (
                    <FallbackPreview />
                  )}
                </div>
              </PreviewSurface>
              {/* Hover overlay */}
              {hoverRect && (
                <BoxOverlay
                  rect={hoverRect}
                  container={containerRef.current}
                  colorClass="ring-red-500/60"
                />
              )}
              {/* Selected overlay with resize handles */}
              {selectedRect && selectedSelector && (
                <ResizeOverlay
                  rect={selectedRect}
                  container={containerRef.current}
                  colorClass="ring-green-500/70"
                  onResizeStart={() => {
                    pushHistory();
                  }}
                  onResize={(nextW, nextH) => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    if (!el) return;
                    try {
                      if (typeof nextW === "number") {
                        (el.style as any).width = `${Math.max(1, Math.round(nextW))}px`;
                      }
                      if (typeof nextH === "number") {
                        (el.style as any).height = `${Math.max(1, Math.round(nextH))}px`;
                      }
                      setSelectedRect(el.getBoundingClientRect());
                    } catch {}
                  }}
                  onResizeEnd={(finalW, finalH) => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    if (!el) return;
                    const prev = overridesRef.current[selectedSelector]?.style || {};
                    const nextStyle: any = { ...prev };
                    if (typeof finalW === "number")
                      nextStyle.width = Math.max(1, Math.round(finalW));
                    if (typeof finalH === "number")
                      nextStyle.height = Math.max(1, Math.round(finalH));
                    overridesRef.current = {
                      ...overridesRef.current,
                      [selectedSelector]: {
                        ...(overridesRef.current[selectedSelector] || {}),
                        style: nextStyle,
                      },
                    };
                    // Trigger autosave via overrides only; avoid preview remount
                    setOverridesRevision((r) => r + 1);
                  }}
                  onDragStart={() => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    if (!el) return;
                    pushHistory();
                    const cs = getComputedStyle(el);
                    const ml = parseInt(cs.marginLeft || "0", 10) || 0;
                    const mt = parseInt(cs.marginTop || "0", 10) || 0;
                    dragStartMarginsRef.current = { marginLeft: ml, marginTop: mt };
                  }}
                  onDrag={(dx, dy) => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    if (!el) return;
                    const base = dragStartMarginsRef.current || { marginLeft: 0, marginTop: 0 };
                    const ml = Math.round(base.marginLeft + dx);
                    const mt = Math.round(base.marginTop + dy);
                    (el.style as any).marginLeft = `${ml}px`;
                    (el.style as any).marginTop = `${mt}px`;
                    setSelectedRect(el.getBoundingClientRect());
                  }}
                  onDragEnd={(dx, dy) => {
                    if (!selectedSelector) return;
                    const base = dragStartMarginsRef.current || { marginLeft: 0, marginTop: 0 };
                    const ml = Math.round(base.marginLeft + (dx || 0));
                    const mt = Math.round(base.marginTop + (dy || 0));
                    const prev = overridesRef.current[selectedSelector]?.style || {};
                    overridesRef.current = {
                      ...overridesRef.current,
                      [selectedSelector]: {
                        ...(overridesRef.current[selectedSelector] || {}),
                        style: { ...prev, marginLeft: ml, marginTop: mt },
                      },
                    };
                    setOverridesRevision((r) => r + 1);
                    dragStartMarginsRef.current = null;
                  }}
                  onRotateStart={() => {
                    // history already captured on resize/move; no-op here
                  }}
                  onRotate={(ang) => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    if (!el) return;
                    (el.style as any).transform = `rotate(${Math.round(ang)}deg)`;
                    setSelectedRect(el.getBoundingClientRect());
                  }}
                  onRotateEnd={(ang) => {
                    if (!selectedSelector) return;
                    const prev = overridesRef.current[selectedSelector]?.style || {};
                    overridesRef.current = {
                      ...overridesRef.current,
                      [selectedSelector]: {
                        ...(overridesRef.current[selectedSelector] || {}),
                        style: { ...prev, transform: `rotate(${Math.round(ang)}deg)` },
                      },
                    };
                    setOverridesRevision((r) => r + 1);
                  }}
                  requestFreshRect={() => {
                    const root = shadowRootRef.current;
                    if (!root || !selectedSelector) return null;
                    const el = root.querySelector(selectedSelector) as HTMLElement | null;
                    return el ? el.getBoundingClientRect() : null;
                  }}
                />
              )}
            </div>
            {/* In-preview actions */}
            {selectedSelector && (
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={undo}
                    disabled={!history.length}
                    className="inline-flex items-center gap-1"
                  >
                    <Undo2 className="h-4 w-4" /> Undo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={redo}
                    disabled={!future.length}
                    className="inline-flex items-center gap-1"
                  >
                    <Redo2 className="h-4 w-4" /> Redo
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      const el = shadowRootRef.current?.querySelector(
                        selectedSelector
                      ) as HTMLElement | null;
                      if (!el) return;
                      try {
                        const html = el.outerHTML || "";
                        navigator.clipboard.writeText(html);
                        toast.success("Copied node HTML");
                      } catch {
                        toast.error("Copy failed");
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copy node
                  </Button>
                  <Button
                    variant="outline"
                    className="inline-flex items-center gap-1"
                    disabled={true}
                    onClick={() => {
                      const root = shadowRootRef.current;
                      if (!root || !selectedSelector) return;
                      const el = root.querySelector(selectedSelector) as HTMLElement | null;
                      if (!el || !el.parentElement) return;
                      try {
                        pushHistory();
                        const clone = el.cloneNode(true) as HTMLElement;
                        el.parentElement.insertBefore(clone, el.nextSibling);
                        const selector = buildUniqueSelector(clone, root as any);
                        const src = overridesRef.current[selectedSelector];
                        if (src) {
                          overridesRef.current = {
                            ...overridesRef.current,
                            [selector]: JSON.parse(JSON.stringify(src)),
                          };
                        }
                        setSelectedSelector(selector);
                        setSelectedRect(clone.getBoundingClientRect());
                        setPreviewRevision((r) => r + 1);
                        setOverridesRevision((r) => r + 1);
                        toast.success("Duplicated node");
                      } catch {
                        toast.error("Duplicate failed");
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      const el = shadowRootRef.current?.querySelector(
                        selectedSelector
                      ) as HTMLElement | null;
                      if (el) {
                        try {
                          pushHistory();
                          el.style.display = "none";
                        } catch {}
                      }
                      applyStyleChange("display", "none");
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      {/* Split handle (desktop only) */}
      <div
        className="hidden xl:block select-none"
        onPointerDown={onSplitPointerDown}
        style={{
          width: 10,
          cursor: isSplitLocked ? "not-allowed" : "col-resize",
          flex: "0 0 auto",
          alignSelf: "stretch",
          background: "transparent",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Resize preview/inspector"
      >
        <div
          style={{
            width: 10,
            height: 64,
            borderRadius: 8,
            background: "rgba(0,0,0,0.08)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 4,
                background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
              }}
            />
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 4,
                background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
              }}
            />
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 4,
                background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
              }}
            />
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 4,
                background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
              }}
            />
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 4,
                background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
              }}
            />
          </div>
        </div>
      </div>
      <section className="space-y-4" style={{ flex: "1 1 0%" }}>
        <div className="rounded-xl border p-4 bg-card">
          <h4 className="text-md font-semibold mb-3 text-red-600 dark:text-red-300">Meta</h4>
          <div className="space-y-3">
            <label className="block text-xs text-foreground/70">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="block text-xs text-foreground/70">Description</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-xl border p-4 bg-card">
          <h4 className="text-md font-semibold mb-3 text-red-600 dark:text-red-300">Inspector</h4>
          {selectedSelector ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-foreground/70 mb-1">Selected</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground/70"
                  value={selectedSelector}
                  readOnly
                />
              </div>
              {/* Inspector Tabs: Formatting, Borders, Gradients, Layout */}
              <Tabs defaultValue="formatting">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="formatting">Formatting</TabsTrigger>
                  <TabsTrigger value="borders">Borders</TabsTrigger>
                  <TabsTrigger value="gradients">Gradients</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                </TabsList>
                <TabsContent value="formatting">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Text</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={selectedText}
                        onChange={(e) => applyTextChange(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-foreground/70 mb-1">
                            Text Color
                          </label>
                          <ColorInputRow
                            value={ensureColor(selectedStyle["color"] as string | undefined)}
                            onChange={(c) => applyStyleChange("color", c)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground/70 mb-1">
                            Background Color
                          </label>
                          <ColorInputRow
                            value={ensureColor(
                              selectedStyle["backgroundColor"] as string | undefined
                            )}
                            onChange={(c) => applyStyleChange("backgroundColor", c)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">
                          Font Size (px)
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={Number(selectedStyle["fontSize"] ?? 16)}
                          onChange={(e) =>
                            applyStyleChange("fontSize", Number(e.target.value || 0))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">
                          Padding (px)
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={Number((selectedStyle as any)["padding"] ?? 0)}
                          onChange={(e) => applyStyleChange("padding", Number(e.target.value || 0))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">Font Family</label>
                        <Select
                          value={(selectedStyle["fontFamily"] as string) || "default"}
                          onValueChange={(val) =>
                            applyStyleChange("fontFamily", val === "default" ? "" : val)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose font" />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.label}
                                value={opt.value === "default" ? "default" : opt.value}
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          className={`rounded-md w-fit border px-4 py-2 text-sm ${selectedStyle["fontStyle"] === "italic" ? "bg-foreground text-background" : ""}`}
                          onClick={() =>
                            applyStyleChange(
                              "fontStyle",
                              selectedStyle["fontStyle"] === "italic" ? "normal" : "italic"
                            )
                          }
                        >
                          Italic
                        </button>
                        <div className="w-full">
                          <label className="block text-xs text-foreground/70 mb-1">Weight</label>
                          <Select
                            value={String(selectedStyle["fontWeight"] ?? 400)}
                            onValueChange={(val) => applyStyleChange("fontWeight", Number(val))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                                <SelectItem key={w} value={String(w)}>
                                  {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="borders">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Border Style</label>
                      <Select
                        value={(selectedStyle["borderStyle"] as string) || "none"}
                        onValueChange={(val) =>
                          applyStyleChange("borderStyle", val === "none" ? "" : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["none", "solid", "dashed", "dotted", "double"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">
                        Border Width (px)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["borderWidth"] ?? 0)}
                        onChange={(e) =>
                          applyStyleChange("borderWidth", Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">
                        Border Radius (px)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["borderRadius"] ?? 0)}
                        onChange={(e) =>
                          applyStyleChange("borderRadius", Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Border Color</label>
                      <ColorInputRow
                        value={ensureColor(
                          (selectedStyle as any)["borderColor"] as string | undefined
                        )}
                        onChange={(c) => applyStyleChange("borderColor", c)}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="gradients">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-foreground/70">Text Gradient</div>
                      <GradientControls
                        current={(selectedStyle as any)["backgroundImage"] as string | undefined}
                        onChange={(g) => {
                          const bi = (selectedStyle as any)["backgroundImage"] as
                            | string
                            | undefined;
                          const parts = (bi && bi.match(/linear-gradient\([^\)]*\)/g)) || [];
                          const bg = parts.length >= 2 ? parts[0] : undefined;
                          const layers: string[] = [];
                          if (bg) layers.push(bg);
                          if (g) layers.push(g);
                          applyStyleChange("backgroundImage", layers.join(", "));
                          applyStyleChange("WebkitBackgroundClip", g ? "text" : "");
                          applyStyleChange("WebkitTextFillColor", g ? "transparent" : "");
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-foreground/70">
                        Background Gradient
                      </div>
                      <GradientControls
                        current={(selectedStyle as any)["backgroundImage"] as string | undefined}
                        onChange={(g) => {
                          const bi = (selectedStyle as any)["backgroundImage"] as
                            | string
                            | undefined;
                          const parts = (bi && bi.match(/linear-gradient\([^\)]*\)/g)) || [];
                          const text = parts.length >= 2 ? parts[1] : undefined;
                          const layers: string[] = [];
                          if (g) layers.push(g);
                          if (text) layers.push(text);
                          applyStyleChange("backgroundImage", layers.join(", "));
                          applyStyleChange("WebkitBackgroundClip", text ? "text" : "");
                          applyStyleChange("WebkitTextFillColor", text ? "transparent" : "");
                          if (g) applyStyleChange("backgroundColor", "");
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="layout">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Width (px)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["width"] ?? 0)}
                        onChange={(e) => applyStyleChange("width", Number(e.target.value || 0))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Height (px)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["height"] ?? 0)}
                        onChange={(e) => applyStyleChange("height", Number(e.target.value || 0))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">
                        Margin Left (px)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["marginLeft"] ?? 0)}
                        onChange={(e) =>
                          applyStyleChange("marginLeft", Number(e.target.value || 0))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">
                        Margin Top (px)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["marginTop"] ?? 0)}
                        onChange={(e) => applyStyleChange("marginTop", Number(e.target.value || 0))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-foreground/70 mb-1">
                        Rotation (deg)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={extractRotationDeg(
                          (selectedStyle as any)["transform"] as string | undefined
                        )}
                        onChange={(e) => {
                          const deg = Math.round(Number(e.target.value || 0));
                          applyStyleChange("transform", `rotate(${deg}deg)`);
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="text-sm text-foreground/70">
              Click any element in the preview to edit it.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SandboxMount({ children }: { children: React.ReactNode }) {
  return <div data-sandbox-root>{children}</div>;
}

function FallbackPreview() {
  return (
    <div className="p-4 text-sm text-red-300">
      Paste a React component on the left to see it here.
    </div>
  );
}

function BoxOverlay({
  rect,
  container,
  colorClass,
}: {
  rect: DOMRect;
  container: HTMLDivElement | null;
  colorClass: string;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    setStyle({
      position: "absolute",
      left: rect.left - hostRect.left,
      top: rect.top - hostRect.top,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    });
  }, [rect, container]);
  return <div className={`absolute ring-2 ${colorClass} rounded-sm`} style={style} />;
}

function ResizeOverlay({
  rect,
  container,
  colorClass,
  onResizeStart,
  onResize,
  onResizeEnd,
  onDragStart,
  onDrag,
  onDragEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  requestFreshRect,
}: {
  rect: DOMRect;
  container: HTMLDivElement | null;
  colorClass: string;
  onResizeStart: () => void;
  onResize: (nextW?: number, nextH?: number) => void;
  onResizeEnd: (finalW?: number, finalH?: number) => void;
  onDragStart: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: (dx?: number, dy?: number) => void;
  onRotateStart: () => void;
  onRotate: (angleDeg: number) => void;
  onRotateEnd: (angleDeg: number) => void;
  requestFreshRect: () => DOMRect | null;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    setStyle({
      position: "absolute",
      left: rect.left - hostRect.left,
      top: rect.top - hostRect.top,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    });
  }, [rect, container]);

  useEffect(() => {
    const onResizeWindow = () => {
      const fresh = requestFreshRect?.();
      if (!fresh) return;
      const hostRect = container?.getBoundingClientRect();
      if (!hostRect) return;
      setStyle({
        position: "absolute",
        left: fresh.left - hostRect.left,
        top: fresh.top - hostRect.top,
        width: fresh.width,
        height: fresh.height,
        pointerEvents: "none",
      });
    };
    window.addEventListener("resize", onResizeWindow);
    return () => window.removeEventListener("resize", onResizeWindow);
  }, [container, requestFreshRect]);

  const startRef = useRef<{ x: number; y: number; rect: DOMRect; mode: string } | null>(null);
  const startDrag = (e: React.PointerEvent, mode: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startRect = requestFreshRect?.() || rect;
    startRef.current = { x: e.clientX, y: e.clientY, rect: startRect, mode };
    onResizeStart?.();
    const onMove = (ev: PointerEvent) => {
      const st = startRef.current;
      if (!st) return;
      const dx = ev.clientX - st.x;
      const dy = ev.clientY - st.y;
      let nextW: number | undefined = undefined;
      let nextH: number | undefined = undefined;
      if (st.mode.includes("e")) nextW = Math.max(1, st.rect.width + dx);
      if (st.mode.includes("s")) nextH = Math.max(1, st.rect.height + dy);
      if (st.mode.includes("w")) nextW = Math.max(1, st.rect.width - dx);
      if (st.mode.includes("n")) nextH = Math.max(1, st.rect.height - dy);
      onResize?.(nextW, nextH);
      const fresh = requestFreshRect?.();
      const hostRect = container?.getBoundingClientRect();
      if (fresh && hostRect) {
        setStyle({
          position: "absolute",
          left: fresh.left - hostRect.left,
          top: fresh.top - hostRect.top,
          width: fresh.width,
          height: fresh.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = () => {
      const st = startRef.current;
      if (st) {
        const fresh = requestFreshRect?.() || st.rect;
        const dx = fresh.width - st.rect.width;
        const dy = fresh.height - st.rect.height;
        let finalW: number | undefined = undefined;
        let finalH: number | undefined = undefined;
        if (st.mode.includes("e") || st.mode.includes("w")) finalW = st.rect.width + dx;
        if (st.mode.includes("s") || st.mode.includes("n")) finalH = st.rect.height + dy;
        onResizeEnd?.(finalW, finalH);
      }
      startRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Move support
  const moveRef = useRef<{ x: number; y: number } | null>(null);
  const startMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    moveRef.current = { x: e.clientX, y: e.clientY };
    onDragStart?.();
    const onMove = (ev: PointerEvent) => {
      const st = moveRef.current;
      if (!st) return;
      const dx = ev.clientX - st.x;
      const dy = ev.clientY - st.y;
      onDrag?.(dx, dy);
      const fresh = requestFreshRect?.();
      const hostRect = container?.getBoundingClientRect();
      if (fresh && hostRect) {
        setStyle({
          position: "absolute",
          left: fresh.left - hostRect.left,
          top: fresh.top - hostRect.top,
          width: fresh.width,
          height: fresh.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = (ev: PointerEvent) => {
      const st = moveRef.current;
      if (st) {
        const dx = ev.clientX - st.x;
        const dy = ev.clientY - st.y;
        onDragEnd?.(dx, dy);
      }
      moveRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Rotate support
  const rotateRef = useRef<{ cx: number; cy: number } | null>(null);
  const startRotate = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) return;
    const fresh = requestFreshRect?.() || rect;
    const cx = fresh.left + fresh.width / 2;
    const cy = fresh.top + fresh.height / 2;
    rotateRef.current = { cx, cy };
    onRotateStart?.();
    const calcAngle = (ev: PointerEvent) => {
      const st = rotateRef.current;
      if (!st) return 0;
      const dx = ev.clientX - st.cx;
      const dy = ev.clientY - st.cy;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };
    const onMove = (ev: PointerEvent) => {
      const ang = calcAngle(ev);
      onRotate?.(ang);
      const freshNow = requestFreshRect?.();
      const host = container?.getBoundingClientRect();
      if (freshNow && host) {
        setStyle({
          position: "absolute",
          left: freshNow.left - host.left,
          top: freshNow.top - host.top,
          width: freshNow.width,
          height: freshNow.height,
          pointerEvents: "none",
        });
      }
    };
    const onUp = (ev: PointerEvent) => {
      const ang = ((): number => {
        const st = rotateRef.current;
        if (!st) return 0;
        const dx = ev.clientX - st.cx;
        const dy = ev.clientY - st.cy;
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      })();
      onRotateEnd?.(ang);
      rotateRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const handle = (pos: string, cursor: string, styleExtra: React.CSSProperties) => (
    <div
      onPointerDown={(e) => startDrag(e, pos)}
      style={{
        position: "absolute",
        width: 10,
        height: 10,
        background: "#16a34a",
        border: "2px solid white",
        borderRadius: 2,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
        ...styleExtra,
        cursor,
      }}
    />
  );

  return (
    <div className={`absolute ring-2 ${colorClass} rounded-sm`} style={style}>
      {/* drag layer to capture pointer events */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      {/* move handle */}
      <div
        onPointerDown={startMove}
        style={{
          position: "absolute",
          left: -28,
          top: -28,
          width: 16,
          height: 16,
          background: "#6b7280",
          border: "2px solid white",
          borderRadius: 4,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
          cursor: "move",
          pointerEvents: "auto",
        }}
      />
      {/* rotate handle */}
      <div
        onPointerDown={startRotate}
        style={{
          position: "absolute",
          left: "50%",
          top: -28,
          marginLeft: -8,
          width: 16,
          height: 16,
          background: "#22c55e",
          border: "2px solid white",
          borderRadius: 9999,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
          cursor: "grab",
          pointerEvents: "auto",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -12,
          marginLeft: -1,
          width: 2,
          height: 12,
          background: "#22c55e",
          pointerEvents: "none",
        }}
      />
      {/* corners */}
      {handle("nw", "nwse-resize", { left: -5, top: -5 })}
      {handle("ne", "nesw-resize", { right: -5, top: -5 })}
      {handle("sw", "nesw-resize", { left: -5, bottom: -5 })}
      {handle("se", "nwse-resize", { right: -5, bottom: -5 })}
      {/* edges */}
      {handle("n", "ns-resize", { left: "50%", top: -6, marginLeft: -5 })}
      {handle("s", "ns-resize", { left: "50%", bottom: -6, marginLeft: -5 })}
      {handle("w", "ew-resize", { top: "50%", left: -6, marginTop: -5 })}
      {handle("e", "ew-resize", { top: "50%", right: -6, marginTop: -5 })}
    </div>
  );
}

const PIXEL_STYLES = new Set([
  "fontSize",
  "padding",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
]);

function ensureColor(value?: string) {
  return value || "#e11d48"; // tailwind red-600
}

function extractRotationDeg(transform?: string): number {
  if (!transform) return 0;
  const m = transform.match(/rotate\(([-+]?\d+(?:\.\d+)?)deg\)/i);
  if (m) {
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  return 0;
}

function buildUniqueSelector(el: Element, root: ParentNode) {
  const parts: string[] = [];
  let cur: Element | null = el as Element;
  while (cur && cur !== root) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) break;
    const index = Array.from(parent.children).indexOf(cur) + 1;
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${index})`);
    cur = parent;
  }
  return parts.length ? parts.join(" > ") : "*[data-sandbox-root]";
}

function renderOverridesCss(overrides: Overrides): string {
  const rules: string[] = [];
  for (const [selector, data] of Object.entries(overrides)) {
    if (data.style && Object.keys(data.style).length) {
      const decl: string[] = [];
      for (const [k, v] of Object.entries(data.style)) {
        const cssKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        const cssVal = typeof v === "number" && PIXEL_STYLES.has(k) ? `${v}px` : String(v);
        decl.push(`${cssKey}: ${cssVal}`);
      }
      rules.push(`${selector} { ${decl.join("; ")} }`);
    }
  }
  return rules.join("\n");
}

function renderOverridesCssWithScope(overrides: Overrides, scopeSelector: string): string {
  const rules: string[] = [];
  for (const [selector, data] of Object.entries(overrides)) {
    if (data.style && Object.keys(data.style).length) {
      const decl: string[] = [];
      for (const [k, v] of Object.entries(data.style)) {
        const cssKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        const cssVal = typeof v === "number" && PIXEL_STYLES.has(k) ? `${v}px` : String(v);
        decl.push(`${cssKey}: ${cssVal} !important`);
      }
      rules.push(`${scopeSelector} ${selector} { ${decl.join("; ")} }`);
    }
  }
  return rules.join("\n");
}

function extractOverrides(source: string): Overrides {
  const re = new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s");
  const m = source.match(re);
  if (!m) return {};
  try {
    const json = m[1].trim();
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object") return obj as Overrides;
  } catch {}
  return {};
}

function injectOverrides(source: string, overrides: Overrides): string {
  const without = source
    .replace(new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s"), "")
    .trimEnd();
  if (!overrides || Object.keys(overrides).length === 0) return without;
  const comment = `\n\n/* ${OVERRIDES_TAG}: ${JSON.stringify(overrides)} */\n`;
  return `${without}${comment}`;
}

const HISTORY_TAG = "@reframe-history";
type HistoryPayload = { history: Overrides[]; future: Overrides[] };

function extractHistory(source: string): HistoryPayload | null {
  const re = new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s");
  const m = source.match(re);
  if (!m) return null;
  try {
    const json = m[1].trim();
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object") return obj as HistoryPayload;
  } catch {}
  return null;
}

function injectHistory(source: string, payload: HistoryPayload): string {
  const without = source.replace(new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s"), "").trimEnd();
  if (!payload) return without;
  const comment = `\n\n/* ${HISTORY_TAG}: ${JSON.stringify(payload)} */\n`;
  return `${without}${comment}`;
}

function stripReframeMetadata(source: string): string {
  return source
    .replace(new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s"), "")
    .replace(new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s"), "")
    .trim();
}

function guessComponentNameFromSource(source: string): string {
  const m1 = source.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  if (m1 && m1[1]) return m1[1];
  const m2 = source.match(/export\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  if (m2 && m2[1]) return m2[1];
  const m3 = source.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/);
  if (m3 && m3[1]) return m3[1];
  const m4 = source.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*[^=]*=>/);
  if (m4 && m4[1]) return m4[1];
  const m5 = source.match(/class\s+([A-Z][A-Za-z0-9_]*)\s+/);
  if (m5 && m5[1]) return m5[1];
  return "Component";
}

function buildTsxWithStyleOverrides(
  cleanedSource: string,
  overrides: Overrides,
  preferredName?: string
): string {
  // Always resolve the actual component identifier from source
  const innerName = guessComponentNameFromSource(cleanedSource);
  // Wrapper name can use the preferred name if provided, otherwise mirror the inner name
  const wrapperBase = preferredName?.trim() || innerName;
  const wrapperName = `${wrapperBase}WithOverrides`;
  const hasDefault = /export\s+default\s+/m.test(cleanedSource);
  const scopeAttr = `[data-reframe-scope="${wrapperName}"]`;
  const css = renderOverridesCssWithScope(overrides, scopeAttr);
  const suffix = `\n\nexport default function ${wrapperName}() {\n  return (\n    <div data-reframe-scope="${wrapperName}">\n      <div className=\"p-6 min-h-[640px]\">\n        <style>{${JSON.stringify(css)}}<\/style>\n        <div data-sandbox-root>\n          <${innerName} \/>\n        <\/div>\n      <\/div>\n    <\/div>\n  );\n}`;
  // Avoid duplicate default exports; if source already has default, just return cleaned source
  return hasDefault ? cleanedSource : `${cleanedSource}${suffix}`;
}

function useCompiledComponent(
  code: string,
  overridesRef: React.MutableRefObject<Overrides>,
  setError: (msg: string | null) => void
) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCompileError(null);
        setError(null);
        const mod = await import("@babel/standalone");
        const processed = preprocessUserCode(code);
        const compiled = mod.transform(processed, {
          presets: [
            ["react", { runtime: "classic", pragma: "React.createElement" }],
            ["typescript", { allowDeclareFields: true, allowNamespaces: true }],
          ],
          filename: "sandbox-component.tsx",
          sourceType: "script",
        }).code as string;

        const prelude = `
          const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useReducer, useContext, createContext, forwardRef, useImperativeHandle, Fragment } = React;
          const clsx = __clsx;
          const cn = (...args) => __twMerge(clsx(...args));
          const tw = (strings, ...exprs) => {
            try {
              const parts = [];
              for (let i = 0; i < strings.length; i++) {
                parts.push(strings[i]);
                if (i < exprs.length) parts.push(String(exprs[i] ?? ""));
              }
              return cn(parts.join(" "));
            } catch { return ""; }
          };
        `;
        const factory = new Function(
          "React",
          "__clsx",
          "__twMerge",
          `${prelude}\n${compiled}\n;return (typeof __returnComponent__ !== 'undefined' ? __returnComponent__ : null);`
        );
        const result = factory(React, clsx, twMerge);
        if (!cancelled) setComponent(() => result);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          const msg = err?.message || "Compile error";
          setCompileError(msg);
          setError(msg);
          setComponent(() => null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Re-apply overrides after successful compile by bumping a no-op state via code update upstream
  useEffect(() => {
    // no-op: overrides are injected via <style> in preview
  }, [overridesRef.current]);

  return { Component, compileError } as {
    Component: React.ComponentType<any> | null;
    compileError: string | null;
  };
}

function preprocessUserCode(input: string): string {
  // Strip imports/exports, detect main component and expose it as __returnComponent__
  let src = input
    .replace(/^[\t ]*import[^\n]*$/gm, "")
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ");

  const nameFromDefault = matchFirst(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/, src);
  const arrowName =
    matchFirst(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/, src) ||
    matchFirst(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*[^=]*=>/, src);
  const compName =
    nameFromDefault ||
    arrowName ||
    matchFirst(/class\s+([A-Z][A-Za-z0-9_]*)\s+/, src) ||
    "Component";

  if (!src.includes("__returnComponent__")) {
    src += `\n;var __returnComponent__ = typeof ${compName} !== 'undefined' ? ${compName} : null;`;
  }
  return src;
}

function matchFirst(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return (m && m[1]) || null;
}

const DEFAULT_SNIPPET = `export default function Component() {
  return (
    <div style={{ padding: 24 }} className="rounded-xl border border-red-800 bg-black/60 text-red-100">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Hello Sandbox</h1>
      <p style={{ fontSize: 14 }}>Select elements to edit visually. Paste your component and go.</p>
      <button style={{ padding: 8, backgroundColor: '#16a34a', color: 'white', borderRadius: 8 }}>Action</button>
    </div>
  );
}`;

function GradientControls({
  current,
  onChange,
}: {
  current?: string;
  onChange: (value: string | null) => void;
}) {
  const parsed = parseLinearGradient(current);
  const [angle, setAngle] = useState<number>(parsed?.angle ?? 90);
  const [stop, setStop] = useState<number>(parsed?.stop ?? 50);
  const [start, setStart] = useState<string>(parsed?.start ?? "#e11d48");
  const [end, setEnd] = useState<string>(parsed?.end ?? "#16a34a");
  const [enabled, setEnabled] = useState<boolean>(Boolean(parsed));

  useEffect(() => {
    if (!enabled) return;
    const clamped = Math.max(0, Math.min(100, stop));
    const spread = 20; // softness of blend region (in percent)
    const half = spread / 2;
    const a = Math.max(0, Math.min(100, clamped - half));
    const b = Math.max(0, Math.min(100, clamped + half));
    const val = `linear-gradient(${angle}deg, ${start} 0%, ${start} ${a}%, ${end} ${b}%, ${end} 100%)`;
    onChange(val);
  }, [enabled, angle, stop, start, end]);

  return (
    <div
      className="rounded-md border p-3 bg-background space-y-3"
      onClick={() => !enabled && setEnabled(!enabled)}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => {
            const next = Boolean(v);
            setEnabled(next);
            if (!next) onChange(null);
          }}
        />
        <span className="text-xs text-foreground/70" onClick={() => setEnabled(!enabled)}>
          Enable
        </span>
      </div>
      {enabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Angle</label>
            <Slider
              value={[angle]}
              onValueChange={(vals) => setAngle(Number(vals?.[0] ?? 0))}
              min={0}
              max={360}
            />
            <div className="mt-1 text-[10px] text-foreground/60">{angle}°</div>
          </div>
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Balance</label>
            <Slider
              value={[stop]}
              onValueChange={(vals) => setStop(Number(vals?.[0] ?? 0))}
              min={0}
              max={100}
            />
            <div className="mt-1 text-[10px] text-foreground/60">{stop}%</div>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Start</label>
              <ColorInputRow value={ensureColor(start)} onChange={setStart} />
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">End</label>
              <ColorInputRow value={ensureColor(end)} onChange={setEnd} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseLinearGradient(
  input?: string
): { angle: number; stop: number; start: string; end: string } | null {
  if (!input) return null;
  // Try four-stop format: start 0%, start P%, end P%, end 100%
  let m = input.match(
    /linear-gradient\((\d+)deg,\s*([^,]+?)\s*0%\s*,\s*\2\s*(\d+)%\s*,\s*([^,]+?)\s*\3%\s*,\s*\4\s*100%\)/i
  );
  if (m) {
    const angle = parseInt(m[1], 10);
    const start = m[2].trim();
    const stop = parseInt(m[3], 10);
    const end = m[4].trim();
    if (Number.isNaN(angle)) return null;
    return { angle, stop: Number.isNaN(stop) ? 50 : stop, start, end };
  }
  // Fallback to two-stop format: start 0%, end P%
  m = input.match(/linear-gradient\((\d+)deg,\s*([^,]+?)\s*0%\s*,\s*([^\s,]+)\s*(\d+)%\)/i);
  if (m) {
    const angle = parseInt(m[1], 10);
    const start = m[2].trim();
    const end = m[3].trim();
    const stop = parseInt(m[4], 10);
    if (Number.isNaN(angle)) return null;
    return { angle, stop: Number.isNaN(stop) ? 50 : stop, start, end };
  }
  return null;
}

function ColorInputRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const display = normalizeColorForInput(value);
  return (
    <input
      type="color"
      className="w-full h-10 rounded-md bg-background appearance-none"
      value={display}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Pick color"
    />
  );
}

function normalizeColorForInput(value?: string): string {
  if (!value) return "#000000";
  const v = value.trim().toLowerCase();
  if (v.startsWith("#")) {
    return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v.slice(0, 7);
  }
  const rgba = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgba) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    const r = parseInt(rgba[1], 10);
    const g = parseInt(rgba[2], 10);
    const b = parseInt(rgba[3], 10);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return "#000000";
}
