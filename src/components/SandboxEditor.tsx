"use client";

import CodeEditor from "@/components/CodeEditor";
import PreviewSurface from "@/components/PreviewSurface";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { parseJsxToTree } from "@/lib/serializer";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { Clipboard, Code2, Eye } from "lucide-react";
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

  // Parse overrides embedded in code
  useEffect(() => {
    overridesRef.current = extractOverrides(code);
  }, []);

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

  // Debounced auto-save on code/name/description changes
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    const t = setTimeout(async () => {
      const sourceToSave = injectOverrides(code, overridesRef.current);
      if (sourceToSave === lastSavedRef.current) return;
      lastSavedRef.current = sourceToSave;
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
  }, [code, name, description, overridesRevision]);

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

  // Force remount preview on code or overrides changes to reflect updates without reload
  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [code, overridesRevision]);

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
      el.textContent = text;
      overridesRef.current = {
        ...overridesRef.current,
        [selectedSelector]: { ...(overridesRef.current[selectedSelector] || {}), text },
      };
      // bump revision to trigger UI refresh + autosave
      setPreviewRevision((r) => r + 1);
      setOverridesRevision((r) => r + 1);
    },
    [selectedSelector]
  );

  const applyStyleChange = useCallback(
    (styleKey: string, value: string | number) => {
      if (!selectedSelector || !shadowRootRef.current) return;
      const root = shadowRootRef.current;
      const el = root.querySelector(selectedSelector) as HTMLElement | null;
      if (!el) return;
      try {
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
    [selectedSelector]
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

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 xl:col-span-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1">
            <span
              className={`h-2 w-2 rounded-full ${status.startsWith("Saved") ? "bg-green-500" : status.includes("fail") ? "bg-red-500" : "bg-red-400"}`}
            />
            <span className="text-xs text-foreground/80">{status}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border bg-card p-0.5">
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1 ${
                  activeTab === "ui"
                    ? "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                    : "text-foreground/60"
                }`}
                onClick={() => setActiveTab("ui")}
              >
                <Eye className="h-3.5 w-3.5" /> UI
              </button>
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1 ${
                  activeTab === "code"
                    ? "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
                    : "text-foreground/60"
                }`}
                onClick={() => setActiveTab("code")}
              >
                <Code2 className="h-3.5 w-3.5" /> Code
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1"
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                toast.success("Copied TSX");
              }}
            >
              <Clipboard className="h-3.5 w-3.5" /> Copy TSX
            </Button>
          </div>
        </div>
        {activeTab === "code" && (
          <div className="rounded-xl border overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              fileName={`${(name || "Component").replace(/\s+/g, "")}\.tsx`}
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
            <div ref={containerRef} className="relative">
              <PreviewSurface onShadowRootReady={(r) => (shadowRootRef.current = r)}>
                <div key={previewKey} className="p-6 min-h-[520px]">
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
              {/* Selected overlay */}
              {selectedRect && (
                <BoxOverlay
                  rect={selectedRect}
                  container={containerRef.current}
                  colorClass="ring-green-500/70"
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="col-span-12 xl:col-span-4 space-y-4">
        <div className="rounded-xl border p-4 bg-card">
          <h4 className="text-sm font-semibold mb-3 text-red-600 dark:text-red-300">Meta</h4>
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
          <h4 className="text-sm font-semibold mb-3 text-red-600 dark:text-red-300">Inspector</h4>
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
              <div>
                <label className="block text-xs text-foreground/70 mb-1">Text</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedText}
                  onChange={(e) => applyTextChange(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-foreground/70 mb-1">Color</label>
                  <input
                    type="color"
                    className="w-full h-9 rounded-md border bg-background"
                    value={ensureColor(selectedStyle["color"] as string | undefined)}
                    onChange={(e) => applyStyleChange("color", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/70 mb-1">Background</label>
                  <input
                    type="color"
                    className="w-full h-9 rounded-md border bg-background"
                    value={ensureColor(selectedStyle["backgroundColor"] as string | undefined)}
                    onChange={(e) => applyStyleChange("backgroundColor", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/70 mb-1">Font Size (px)</label>
                  <input
                    type="number"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={Number(selectedStyle["fontSize"] ?? 16)}
                    onChange={(e) => applyStyleChange("fontSize", Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/70 mb-1">Padding (px)</label>
                  <input
                    type="number"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={Number((selectedStyle as any)["padding"] ?? 0)}
                    onChange={(e) => applyStyleChange("padding", Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/70">
              Click any element in the preview to edit it.
            </p>
          )}
        </div>
      </div>
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

const PIXEL_STYLES = new Set([
  "fontSize",
  "padding",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
]);

function ensureColor(value?: string) {
  return value || "#e11d48"; // tailwind red-600
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
