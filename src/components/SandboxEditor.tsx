/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import CodeEditor from "@/components/CodeEditor";
import PreviewSurface from "@/components/PreviewSurface";
import PreviewToolbar from "@/components/PreviewToolbar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FONT_OPTIONS } from "@/constants";
import { updateUpdateComponentMutation } from "@/lib/api/component/component.hook";
import { api } from "@/lib/api/component/component.service";
import { parseJsxToTree } from "@/lib/serializer";
import { useUserStore } from "@/stores";
import { useDraftStore } from "@/stores/draft.store";
import clsx from "clsx";
import { Copy, Redo2, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { ColorInputRow, GradientControls, ensureColor } from "./sandbox/Controls";
import { BoxOverlay, ResizeOverlay } from "./sandbox/Overlays";
import { useCompiledComponent } from "./sandbox/compile";
import { DEFAULT_SNIPPET } from "./sandbox/defaults";
import type { Overrides } from "./sandbox/overrides";
import {
  PIXEL_STYLES,
  buildTsxWithStyleOverrides,
  extractHistory,
  extractOverrides,
  extractRotationDeg,
  injectHistory,
  injectOverrides,
  renderOverridesCss,
  stripReframeMetadata,
} from "./sandbox/overrides";
import { buildUniqueSelector } from "./sandbox/selectors";

type SandboxEditorProps = {
  id: string;
  initialSource?: string;
  initialName?: string;
  initialDescription?: string;
};

export default function SandboxEditor({
  id,
  initialSource,
  initialName,
  initialDescription,
}: SandboxEditorProps) {
  const { user } = useUserStore();
  const router = useRouter();
  const setDraft = useDraftStore((s) => s.setDraft);
  const clearDraft = useDraftStore((s) => s.clearDraft);
  const setPostAuthId = useDraftStore((s) => s.setPostAuthId);
  const consumePostAuthId = useDraftStore((s) => s.consumePostAuthId);

  const [code, setCode] = useState<string>(() => initialSource || DEFAULT_SNIPPET);
  const [name, setName] = useState<string>(initialName || "");
  const [description, setDescription] = useState<string>(initialDescription || "");
  const [status, setStatus] = useState<string>("Auto-saving");
  const [instanceKey, setInstanceKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"ui" | "code">("ui");
  const [overridesRevision, setOverridesRevision] = useState<number>(0);
  const [previewRevision, setPreviewRevision] = useState<number>(0);
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [showPreviewFrame, setShowPreviewFrame] = useState<boolean>(true);
  const [selectionEnabled, setSelectionEnabled] = useState<boolean>(true);

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
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Match Tailwind's xl breakpoint (min-width: 1280px)
    const mql = window.matchMedia("(min-width: 1280px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop((e as any).matches);
    setIsDesktop(mql.matches);
    mql.addEventListener("change", handler as any);
    return () => mql.removeEventListener("change", handler as any);
  }, []);

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
  const updateMutation = updateUpdateComponentMutation(id, setStatus, user?.userId);

  // Throttled auto-save with a minimum 15s interval between saves
  const lastSavedRef = useRef<string>("");
  const lastSavedAtRef = useRef<number>(0);
  const pendingSaveKeyRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<boolean>(false);
  const forceCreateRef = useRef<boolean>(false);

  const computeSaveState = useCallback(() => {
    let sourceToSave = injectOverrides(code, overridesRef.current);
    sourceToSave = injectHistory(sourceToSave, { history, future });
    const saveKey = JSON.stringify({
      source: sourceToSave,
      name: name || undefined,
      description: description || undefined,
    });
    return { sourceToSave, saveKey };
  }, [code, name, description, history, future]);

  const performSave = useCallback(
    async (opts?: { manual?: boolean }) => {
      const { manual } = opts || {};
      const { sourceToSave, saveKey } = computeSaveState();
      // If not authenticated, prompt and stash current work for post-auth
      if (!user?.userId) {
        try {
          setDraft(id, { source: sourceToSave, name: name || "", description: description || "" });
          setPostAuthId(id);
        } catch {}
        if (manual) setShowAuthPrompt(true);
        return;
      }
      if (saveKey === lastSavedRef.current) {
        if (manual) toast.info("No changes to save");
        return;
      }
      if (saveInFlightRef.current) {
        // A save is already running; mark pending and exit. It will be scheduled after current save.
        pendingSaveKeyRef.current = saveKey;
        if (manual) toast.info("Save already in progress");
        return;
      }
      pendingSaveKeyRef.current = saveKey;
      saveInFlightRef.current = true;
      let tree: any | undefined;
      try {
        tree = await parseJsxToTree(sourceToSave);
      } catch {}
      try {
        if (id.startsWith("unsaved-") || forceCreateRef.current) {
          if (!user?.userId) {
            throw new Error("Please login to save your changes");
          }
          const { component } = await api.createComponent({
            source: sourceToSave,
            tree,
            name: name || undefined,
            description: description || undefined,
          });
          lastSavedRef.current = saveKey;
          lastSavedAtRef.current = Date.now();
          pendingSaveKeyRef.current = null;
          if (manual) toast.success("Saved changes");
          forceCreateRef.current = false;
          try {
            clearDraft(id);
            consumePostAuthId();
          } catch {}
          router.replace(`/preview/${component.componentId}`);
          return;
        }
        await updateMutation.mutateAsync({
          source: sourceToSave,
          tree,
          name: name || undefined,
          description: description || undefined,
        });
        lastSavedRef.current = saveKey;
        lastSavedAtRef.current = Date.now();
        pendingSaveKeyRef.current = null;
        if (manual) toast.success("Saved changes");
      } catch (e: any) {
        const msg = e?.message || "Save failed";
        if (manual) toast.error(msg);
      } finally {
        saveInFlightRef.current = false;
        // If changes accrued during the save, schedule a new autosave respecting the 15s window
        const { saveKey: currentKey } = computeSaveState();
        if (currentKey !== lastSavedRef.current) {
          scheduleAutosave();
        }
      }
    },
    [computeSaveState, updateMutation, name, description]
  );

  const scheduleAutosave = useCallback(() => {
    const { saveKey } = computeSaveState();
    pendingSaveKeyRef.current = saveKey;
    if (autosaveTimerRef.current) return;
    const now = Date.now();
    const elapsed = now - (lastSavedAtRef.current || 0);
    const minDelay = 15000;
    const delay = elapsed >= minDelay ? 0 : minDelay - elapsed;
    autosaveTimerRef.current = setTimeout(async () => {
      autosaveTimerRef.current = null;
      if (pendingSaveKeyRef.current && pendingSaveKeyRef.current !== lastSavedRef.current) {
        await performSave();
      }
    }, delay);
  }, [computeSaveState, performSave]);

  useEffect(() => {
    scheduleAutosave();
  }, [code, name, description, overridesRevision, history, future, scheduleAutosave]);

  // Initialize lastSavedRef to current state to avoid initial autosave when nothing changed
  useEffect(() => {
    const { saveKey } = computeSaveState();
    if (!lastSavedRef.current) {
      lastSavedRef.current = saveKey;
      lastSavedAtRef.current = Date.now();
    }
  }, []);

  // Compile + evaluate to component
  const { Component, compileError } = useCompiledComponent(code, overridesRef, setErrorMsg);

  // Trigger post-auth save for unsaved components when returning from auth
  useEffect(() => {
    try {
      if (!user?.userId || !id.startsWith("unsaved-")) return;
      const marker = consumePostAuthId();
      if (marker === id) {
        // Force a save attempt
        lastSavedRef.current = "__force_post_auth_save__";
        forceCreateRef.current = true;
        performSave({ manual: true });
      }
    } catch {}
  }, [user?.userId, id, performSave]);

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
    if (!selectionEnabled) {
      setHoverRect(null);
      setSelectedRect(null);
      setSelectedSelector(null);
      return;
    }
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
  }, [previewRevision, previewKey, activeTab, selectionEnabled]);

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
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      // Save shortcut
      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        performSave({ manual: true });
        return;
      }
      if (activeTab !== "ui") return;
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
  }, [activeTab, undo, redo, performSave]);

  return (
    <div ref={splitRef} className="items-start gap-4 xl:flex">
      <section
        className="space-y-3"
        style={{
          width: isDesktop ? leftWidth : undefined,
          flex: isDesktop ? "0 0 auto" : undefined,
        }}
      >
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 px-1">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-200 ring-1 ring-red-800/60">
              Sandbox Preview
            </span>
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1">
              <span
                className={`h-2 w-2 rounded-full ${status.startsWith("Saved") ? "bg-green-500" : status.includes("fail") ? "bg-red-500" : "bg-red-400"}`}
              />
              <span className="text-xs text-foreground/80">{status}</span>
            </div>
          </div>

          <div className="w-full xl:w-auto flex flex-wrap items-center gap-2 justify-start xl:justify-end">
            <PreviewToolbar
              previewDevice={previewDevice}
              onPreviewDeviceChange={(v) => setPreviewDevice(v)}
              customPreviewWidth={customPreviewWidth}
              customPreviewHeight={customPreviewHeight}
              onChangeCustomWidth={(n) => setCustomPreviewWidth(n)}
              onChangeCustomHeight={(n) => setCustomPreviewHeight(n)}
              selectionEnabled={selectionEnabled}
              onToggleSelection={() => setSelectionEnabled((v) => !v)}
              isSplitLocked={isSplitLocked}
              onToggleSplitLock={() => setIsSplitLocked((v) => !v)}
              onResetLayout={handleResetSplit}
              showPreviewFrame={showPreviewFrame}
              onTogglePreviewFrame={() => setShowPreviewFrame((v) => !v)}
              activeTab={activeTab}
              onChangeTab={(t) => setActiveTab(t)}
              copyButtonText="Copy TSX"
              onClickCopy={async () => {
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
              onClickSave={() => performSave({ manual: true })}
            />
          </div>
        </div>
        {activeTab === "code" && (
          <div className="rounded-xl border overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              fileName={`${(name || "Component").replace(/\s+/g, "")}.tsx`}
              onSave={() => performSave({ manual: true })}
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
              className={twMerge(
                clsx(
                  "relative",
                  showPreviewFrame &&
                    "rounded-lg ring-2 ring-red-900/40 dark:ring-red-700/40 bg-background"
                )
              )}
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
                <div
                  key={previewKey}
                  className="p-6 min-h-[480px] sm:min-h-[600px] xl:min-h-[730px]"
                >
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-wrap border-t px-3 py-2">
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
          <div className="flex flex-row items-center justify-between mb-3">
            <h4 className="text-md font-semibold text-red-600 dark:text-red-300">Meta</h4>
            <div className="flex flex-row items-center gap-3">
              <Link
                className="text-sm underline decoration-dotted text-red-700 dark:text-red-200"
                href="/components"
              >
                Components
              </Link>
              <Link className="text-sm text-red-600 dark:text-red-400 hover:underline" href="/">
                New import
              </Link>
            </div>
          </div>
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
      {showAuthPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-1">Sign in to save</h2>
            <p className="text-sm text-foreground/70 mb-4">
              You need an account to save changes. Sign in or create one now.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAuthPrompt(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const callbackUrl =
                    typeof window !== "undefined"
                      ? `${window.location.pathname}${window.location.search}`
                      : "/";
                  router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                }}
                className="cursor-pointer"
              >
                Sign in
              </Button>
              <Button
                onClick={() => {
                  const callbackUrl =
                    typeof window !== "undefined"
                      ? `${window.location.pathname}${window.location.search}`
                      : "/";
                  router.push(`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                }}
                className="cursor-pointer"
              >
                Create account
              </Button>
            </div>
          </div>
        </div>
      )}
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
