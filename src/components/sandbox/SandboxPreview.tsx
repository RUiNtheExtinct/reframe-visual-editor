/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import clsx from "clsx";
import { Copy, Redo2, Trash2, Undo2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

import CodeEditor from "@/components/CodeEditor";
import PreviewSurface from "@/components/PreviewSurface";
import PreviewToolbar from "@/components/PreviewToolbar";
import { Button } from "@/components/ui/button";
import { BoxOverlay, ResizeOverlay } from "./Overlays";
import { renderOverridesCss } from "./overrides";
import { buildUniqueSelector } from "./selectors";

import type { Overrides } from "./overrides";

type Device = "desktop" | "tablet" | "mobile" | "custom";

export type SandboxPreviewProps = {
  isDesktop: boolean;
  leftWidth: number;

  previewDevice: Device;
  onPreviewDeviceChange: (v: Device) => void;
  customPreviewWidth: number;
  customPreviewHeight: number;
  onChangeCustomWidth: (n: number) => void;
  onChangeCustomHeight: (n: number) => void;

  selectionEnabled: boolean;
  onToggleSelection: () => void;
  isSplitLocked: boolean;
  onToggleSplitLock: () => void;
  onResetLayout: () => void;
  showPreviewFrame: boolean;
  onTogglePreviewFrame: () => void;

  activeTab: "ui" | "code";
  onChangeTab: (t: "ui" | "code") => void;

  copyButtonText: string;
  onClickCopy: () => void | Promise<void>;
  onClickSave: () => void;
  status: string;

  code: string;
  onChangeCode: (v: string) => void;
  fileName: string;
  onSaveCode: () => void;

  getPreviewSize: () => { width: number; height?: number };
  shadowRootRef: React.MutableRefObject<ShadowRoot | null>;

  selectedSelector: string | null;
  setSelectedSelector: (s: string | null) => void;
  hoverRect: DOMRect | null;
  setHoverRect: (r: DOMRect | null) => void;
  selectedRect: DOMRect | null;
  setSelectedRect: (r: DOMRect | null) => void;

  overridesRef: React.MutableRefObject<Overrides>;
  overridesRevision: number;
  setOverridesRevision: (updater: (n: number) => number) => void;
  previewRevision: number;
  setPreviewRevision: (updater: (n: number) => number) => void;
  previewKey: number;

  history: Overrides[];
  future: Overrides[];
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  applyStyleChange: (key: string, value: string | number) => void;

  Component: React.ComponentType | null;
  compileError: string | null;
};

export default function SandboxPreview(props: SandboxPreviewProps) {
  const {
    isDesktop,
    leftWidth,
    previewDevice,
    onPreviewDeviceChange,
    customPreviewWidth,
    customPreviewHeight,
    onChangeCustomWidth,
    onChangeCustomHeight,
    selectionEnabled,
    onToggleSelection,
    isSplitLocked,
    onToggleSplitLock,
    onResetLayout,
    showPreviewFrame,
    onTogglePreviewFrame,
    activeTab,
    onChangeTab,
    copyButtonText,
    onClickCopy,
    onClickSave,
    status,
    code,
    onChangeCode,
    fileName,
    onSaveCode,
    getPreviewSize,
    shadowRootRef,
    selectedSelector,
    setSelectedSelector,
    hoverRect,
    setHoverRect,
    selectedRect,
    setSelectedRect,
    overridesRef,
    overridesRevision,
    setOverridesRevision,
    previewRevision,
    setPreviewRevision,
    previewKey,
    history,
    future,
    undo,
    redo,
    pushHistory,
    applyStyleChange,
    Component,
    compileError,
  } = props;

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Bind hover/selection inside shadow root when active
  React.useEffect(() => {
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
  }, [
    shadowRootRef,
    activeTab,
    selectionEnabled,
    previewRevision,
    previewKey,
    setHoverRect,
    setSelectedRect,
    setSelectedSelector,
  ]);

  return (
    <section
      className="space-y-3"
      style={{ width: isDesktop ? leftWidth : undefined, flex: isDesktop ? "0 0 auto" : undefined }}
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <PreviewToolbar
          previewDevice={previewDevice}
          onPreviewDeviceChange={(v) => onPreviewDeviceChange(v)}
          customPreviewWidth={customPreviewWidth}
          customPreviewHeight={customPreviewHeight}
          onChangeCustomWidth={(n) => onChangeCustomWidth(n)}
          onChangeCustomHeight={(n) => onChangeCustomHeight(n)}
          selectionEnabled={selectionEnabled}
          onToggleSelection={onToggleSelection}
          isSplitLocked={isSplitLocked}
          onToggleSplitLock={onToggleSplitLock}
          onResetLayout={onResetLayout}
          showPreviewFrame={showPreviewFrame}
          onTogglePreviewFrame={onTogglePreviewFrame}
          activeTab={activeTab}
          onChangeTab={(t) => onChangeTab(t)}
          copyButtonText={copyButtonText}
          onClickCopy={onClickCopy}
          onClickSave={onClickSave}
          status={status}
        />
      </div>
      {activeTab === "code" && (
        <div className="rounded-xl border overflow-hidden">
          <CodeEditor
            value={code}
            onChange={onChangeCode}
            fileName={fileName}
            onSave={onSaveCode}
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
                key={props.previewKey}
                className="p-6 min-h-[480px] sm:min-h-[600px] xl:min-h-[730px]"
              >
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
            {hoverRect && (
              <BoxOverlay
                rect={hoverRect}
                container={containerRef.current}
                colorClass="ring-red-500/60"
              />
            )}
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
                  if (!selectedSelector) return;
                  const prev = overridesRef.current[selectedSelector]?.style || {};
                  const nextStyle: any = { ...prev };
                  if (typeof finalW === "number") nextStyle.width = Math.max(1, Math.round(finalW));
                  if (typeof finalH === "number")
                    nextStyle.height = Math.max(1, Math.round(finalH));
                  overridesRef.current = {
                    ...overridesRef.current,
                    [selectedSelector]: {
                      ...(overridesRef.current[selectedSelector] || {}),
                      style: nextStyle,
                    },
                  };
                  setOverridesRevision((r) => r + 1);
                }}
                onDragStart={() => {
                  pushHistory();
                }}
                onDrag={(dx, dy) => {
                  const root = shadowRootRef.current;
                  if (!root || !selectedSelector) return;
                  const el = root.querySelector(selectedSelector) as HTMLElement | null;
                  if (!el) return;
                  const cs = getComputedStyle(el);
                  const baseML = parseInt(cs.marginLeft || "0", 10) || 0;
                  const baseMT = parseInt(cs.marginTop || "0", 10) || 0;
                  const ml = Math.round(baseML + dx);
                  const mt = Math.round(baseMT + dy);
                  (el.style as any).marginLeft = `${ml}px`;
                  (el.style as any).marginTop = `${mt}px`;
                  setSelectedRect(el.getBoundingClientRect());
                }}
                onDragEnd={(dx, dy) => {
                  if (!selectedSelector) return;
                  const root = shadowRootRef.current;
                  if (!root) return;
                  const el = root.querySelector(selectedSelector) as HTMLElement | null;
                  const cs = el ? getComputedStyle(el) : (null as any);
                  const baseML = cs ? parseInt(cs.marginLeft || "0", 10) || 0 : 0;
                  const baseMT = cs ? parseInt(cs.marginTop || "0", 10) || 0 : 0;
                  const ml = Math.round(baseML + (dx || 0));
                  const mt = Math.round(baseMT + (dy || 0));
                  const prev = overridesRef.current[selectedSelector]?.style || {};
                  overridesRef.current = {
                    ...overridesRef.current,
                    [selectedSelector]: {
                      ...(overridesRef.current[selectedSelector] || {}),
                      style: { ...prev, marginLeft: ml, marginTop: mt },
                    },
                  };
                  setOverridesRevision((r) => r + 1);
                }}
                onRotateStart={() => {}}
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
                        } as any;
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
                        (el.style as any).display = "none";
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
