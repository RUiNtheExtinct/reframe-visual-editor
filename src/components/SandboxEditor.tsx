/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import { updateUpdateComponentMutation } from "@/lib/api/component/component.hook";
import { api } from "@/lib/api/component/component.service";
import { parseJsxToTree } from "@/lib/serializer";
import { useUserStore } from "@/stores";
import { useDraftStore } from "@/stores/draft.store";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthPrompt } from "./auth-prompt";
import { useCompiledComponent } from "./sandbox/compile";
import { DEFAULT_SNIPPET } from "./sandbox/defaults";
import { DividerHandle } from "./sandbox/divider-handle";
import type { Overrides } from "./sandbox/overrides";
import {
  PIXEL_STYLES,
  buildTsxWithStyleOverrides,
  extractHistory,
  extractOverrides,
  injectHistory,
  injectOverrides,
  stripReframeMetadata,
} from "./sandbox/overrides";
import SandboxInspector from "./sandbox/SandboxInspector";
import SandboxPreview from "./sandbox/SandboxPreview";

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
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const overridesRef = useRef<Overrides>({});
  const [history, setHistory] = useState<Overrides[]>([]);
  const [future, setFuture] = useState<Overrides[]>([]);
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

  // Hover/selection handlers moved into SandboxPreview

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
    <div ref={splitRef} className="items-start flex flex-col gap-4 xl:flex-row">
      <SandboxPreview
        isDesktop={isDesktop}
        leftWidth={leftWidth}
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
        status={status}
        code={code}
        onChangeCode={setCode}
        fileName={`${(name || "Component").replace(/\s+/g, "")}\.tsx`}
        onSaveCode={() => performSave({ manual: true })}
        getPreviewSize={getPreviewSize}
        shadowRootRef={shadowRootRef}
        selectedSelector={selectedSelector}
        setSelectedSelector={setSelectedSelector}
        hoverRect={hoverRect}
        setHoverRect={setHoverRect}
        selectedRect={selectedRect}
        setSelectedRect={setSelectedRect}
        overridesRef={overridesRef}
        overridesRevision={overridesRevision}
        setOverridesRevision={setOverridesRevision}
        previewRevision={previewRevision}
        setPreviewRevision={setPreviewRevision}
        previewKey={previewKey}
        history={history}
        future={future}
        undo={undo}
        redo={redo}
        pushHistory={pushHistory}
        applyStyleChange={applyStyleChange}
        Component={Component}
        compileError={compileError}
      />

      {/* Split handle (desktop only) */}
      <DividerHandle onSplitPointerDown={onSplitPointerDown} isSplitLocked={isSplitLocked} />

      <SandboxInspector
        name={name}
        description={description}
        setName={setName}
        setDescription={setDescription}
        selectedSelector={selectedSelector}
        selectedText={selectedText}
        selectedStyle={selectedStyle}
        applyTextChange={applyTextChange}
        applyStyleChange={applyStyleChange}
      />

      <AuthPrompt showAuthPrompt={showAuthPrompt} setShowAuthPrompt={setShowAuthPrompt} />
    </div>
  );
}
