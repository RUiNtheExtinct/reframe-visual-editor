/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import CodeEditor from "@/components/CodeEditor";
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
import type { ComponentTree, EditorNode, ElementNode, TextNode } from "@/lib/editorTypes";
import { parseJsxToTree, serializeTreeToSource } from "@/lib/serializer";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, RotateCcw, Unlock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import PreviewSurface from "./PreviewSurface";

type WebsiteEditorProps = {
  tree: ComponentTree;
  onChange?: (tree: ComponentTree) => void;
  onSave?: (serialized: string) => Promise<void> | void;
  autoSave?: boolean;
  title?: string;
  name?: string;
  description?: string;
  onMetaChange?: (partial: { name?: string; description?: string }) => void;
};

export default function WebsiteEditor({
  tree,
  onChange,
  onSave,
  autoSave = true,
  title,
  name,
  description,
  onMetaChange,
}: WebsiteEditorProps) {
  const [currentTree, setCurrentTree] = useState<ComponentTree>(tree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"design" | "code">("design");
  const [code, setCode] = useState<string>(serializeTreeToSource(tree, name));
  const lastChangeSourceRef = useRef<"ui" | "code" | null>(null);
  const [codeInstanceKey, setCodeInstanceKey] = useState(0);
  const previewShadowRootRef = useRef<ShadowRoot | null>(null);
  const initialHydratedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const selectedNode = useMemo(
    () => (selectedId ? findNode(currentTree.root, selectedId) : null),
    [currentTree, selectedId]
  );

  useEffect(() => setCurrentTree(tree), [tree]);
  useEffect(() => {
    initialHydratedRef.current = false;
  }, [tree]);
  // Keep code in sync when not actively editing code
  useEffect(() => {
    if (activeTab !== "code") {
      setCode(serializeTreeToSource(currentTree, name));
    }
  }, [currentTree, name, activeTab]);

  // Hydrate missing style values from computed styles (one-time per load)
  useEffect(() => {
    if (activeTab !== "design") return;
    const root = previewShadowRootRef.current;
    if (!root) return;
    if (initialHydratedRef.current) return;

    let frame = 0;
    let rafId: number | null = null;
    const tick = () => {
      const ready = (root as any).__twindReady === true;
      if (!ready && frame < 30) {
        frame += 1;
        rafId = requestAnimationFrame(tick);
        return;
      }
      try {
        setCurrentTree((prev) => {
          const nextRoot = hydrateStylesFromDom(prev.root, root);
          if (nextRoot === prev.root) return prev;
          lastChangeSourceRef.current = "ui";
          initialHydratedRef.current = true;
          return { root: nextRoot };
        });
      } catch {
        // ignore
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeTab, currentTree]);

  // Track selected element rect for overlay
  useEffect(() => {
    if (activeTab !== "design") return;
    const root = previewShadowRootRef.current;
    if (!root || !selectedId) {
      setSelectedRect(null);
      return;
    }
    const el = root.querySelector(
      `[data-node-id="${CSS.escape(selectedId)}"]`
    ) as HTMLElement | null;
    setSelectedRect(el ? el.getBoundingClientRect() : null);
  }, [selectedId, currentTree, activeTab]);

  useEffect(() => {
    const onResize = () => {
      if (activeTab !== "design") return;
      const root = previewShadowRootRef.current;
      if (!root || !selectedId) return;
      const el = root.querySelector(
        `[data-node-id="${CSS.escape(selectedId)}"]`
      ) as HTMLElement | null;
      setSelectedRect(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [selectedId, activeTab]);

  // When switching to Code tab, refresh code from current tree to reflect latest UI edits
  useEffect(() => {
    if (activeTab === "code") {
      setCode(serializeTreeToSource(currentTree, name));
    }
  }, [activeTab]);

  // Parse code edits back to tree (debounced)
  useEffect(() => {
    if (activeTab !== "code") return;
    const id = setTimeout(async () => {
      try {
        const next = await parseJsxToTree(code);
        setCurrentTree(next);
        lastChangeSourceRef.current = "code";
      } catch {
        // Ignore parse errors silently; the import function already handles toast on failure
      }
    }, 500);
    return () => clearTimeout(id);
  }, [code, activeTab]);

  useEffect(() => {
    if (activeTab === "code" && lastChangeSourceRef.current === "ui") {
      setCode(serializeTreeToSource(currentTree, name));
      setCodeInstanceKey((k) => k + 1);
      lastChangeSourceRef.current = null;
    }
  }, [currentTree, name, activeTab]);

  const lastSerializedRef = useRef<string | null>(null);
  useEffect(() => {
    onChange?.(currentTree);
    if (!autoSave || !onSave) return;
    const serialized = JSON.stringify(currentTree);
    if (serialized === lastSerializedRef.current) return; // no changes
    const id = setTimeout(() => {
      lastSerializedRef.current = serialized;
      onSave(serialized);
    }, 1000);
    return () => clearTimeout(id);
  }, [currentTree, autoSave, onSave, onChange]);

  const updateNode = useCallback((id: string, updater: (node: EditorNode) => EditorNode) => {
    lastChangeSourceRef.current = "ui";
    setCurrentTree((prev) => ({
      root: updateNodeRecursive(prev.root, id, updater),
    }));
  }, []);

  const generateId = () =>
    typeof crypto !== "undefined" && (crypto as any).randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    lastChangeSourceRef.current = "ui";
    setCurrentTree((prev) => ({ root: deleteNode(prev.root, selectedId) }));
    setSelectedId(null);
    toast.success("Deleted element");
  }, [selectedId]);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    lastChangeSourceRef.current = "ui";
    setCurrentTree((prev) => ({ root: duplicateNode(prev.root, selectedId, generateId) }));
    toast.success("Duplicated element");
  }, [selectedId]);

  const handleAddText = useCallback(() => {
    if (!selectedId) return;
    lastChangeSourceRef.current = "ui";
    setCurrentTree((prev) => ({ root: addSiblingText(prev.root, selectedId, generateId) }));
    toast.success("Added text element");
  }, [selectedId]);

  // Resizable split between preview and inspector
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [leftWidth, setLeftWidth] = useState<number>(0);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
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
  const [isSplitLocked, setIsSplitLocked] = useState<boolean>(false);
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

  const buildPreviewExportTsx = useCallback(() => {
    const root = previewShadowRootRef.current as ShadowRoot | null;
    if (!root) return null;
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

  return (
    <div ref={splitRef} className="max-w-6xl mx-auto px-1 xl:flex gap-6">
      <div
        className="rounded-xl border bg-card p-3 overflow-auto transition-shadow duration-200 hover:shadow-lg"
        style={{ width: leftWidth, flex: "0 0 auto" }}
      >
        <div className="flex items-center justify-between px-1 py-2">
          <h2 className="text-sm font-medium text-muted-foreground">{title ?? "Preview"}</h2>
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
                  <span className="text-xs text-muted-foreground">×</span>
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
                title={isSplitLocked ? "Unlock layout to reset" : "Reset Layout"}
                aria-label={isSplitLocked ? "Unlock layout to reset" : "Reset Layout"}
                disabled={isSplitLocked}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="inline-flex items-center rounded-md border bg-background p-0.5">
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] ${
                  activeTab === "design" ? "bg-card border" : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("design")}
              >
                UI
              </button>
              <button
                className={`px-3 py-1.5 text-xs rounded-[6px] ${
                  activeTab === "code" ? "bg-card border" : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("code")}
              >
                Code
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const tsx = buildPreviewExportTsx();
                const src =
                  tsx || (activeTab === "code" ? code : serializeTreeToSource(currentTree, name));
                await navigator.clipboard.writeText(src);
                toast.success(tsx ? "Copied snapshot TSX" : "Copied component TSX");
              }}
            >
              Copy TSX
            </Button>
          </div>
        </div>
        <div
          className="rounded-lg border bg-background p-0 transition-colors"
          ref={containerRef}
          style={{
            width: Math.min(getPreviewSize().width, (leftWidth || 1200) - 24),
            marginLeft: "auto",
            marginRight: "auto",
            ...(previewDevice === "custom" && getPreviewSize().height
              ? { height: getPreviewSize().height }
              : {}),
          }}
        >
          {activeTab === "design" ? (
            <PreviewSurface onShadowRootReady={(r) => (previewShadowRootRef.current = r)}>
              <div className="p-6 min-h-[730px]">
                <div className="text-xs text-muted-foreground mb-2">Click elements to edit</div>
                {renderNode(currentTree.root, selectedId, setSelectedId)}
              </div>
            </PreviewSurface>
          ) : (
            <div className="p-2">
              <CodeEditor
                value={code}
                onChange={setCode}
                fileName={`${(name || "Component").replace(/\s+/g, "")}.tsx`}
                instanceKey={codeInstanceKey}
              />
            </div>
          )}
          {activeTab === "design" && selectedRect && selectedId && (
            <ResizeOverlay
              rect={selectedRect}
              container={containerRef.current}
              colorClass="ring-primary/70"
              onResizeStart={() => {}}
              onResize={(nextW, nextH) => {
                if (!selectedId) return;
                updateNode(selectedId, (node) => {
                  const style: any = { ...(node.style ?? {}) };
                  if (typeof nextW === "number") style.width = Math.max(1, Math.round(nextW));
                  if (typeof nextH === "number") style.height = Math.max(1, Math.round(nextH));
                  return { ...node, style } as any;
                });
                const root = previewShadowRootRef.current;
                const el = root?.querySelector(
                  `[data-node-id="${CSS.escape(selectedId)}"]`
                ) as HTMLElement | null;
                if (el) setSelectedRect(el.getBoundingClientRect());
              }}
              onResizeEnd={() => {}}
              onDragStart={() => {}}
              onDrag={(dx, dy) => {
                if (!selectedId) return;
                updateNode(selectedId, (node) => {
                  const style: any = { ...(node.style ?? {}) };
                  style.marginLeft = Math.round(Number(style.marginLeft || 0) + dx);
                  style.marginTop = Math.round(Number(style.marginTop || 0) + dy);
                  return { ...node, style } as any;
                });
                const root = previewShadowRootRef.current;
                const el = root?.querySelector(
                  `[data-node-id="${CSS.escape(selectedId)}"]`
                ) as HTMLElement | null;
                if (el) setSelectedRect(el.getBoundingClientRect());
              }}
              onDragEnd={() => {}}
              onRotateStart={() => {}}
              onRotate={(ang) => {
                if (!selectedId) return;
                updateNode(selectedId, (node) => {
                  const style: any = { ...(node.style ?? {}) };
                  style.transform = `rotate(${Math.round(ang)}deg)`;
                  return { ...node, style } as any;
                });
                const root = previewShadowRootRef.current;
                const el = root?.querySelector(
                  `[data-node-id="${CSS.escape(selectedId)}"]`
                ) as HTMLElement | null;
                if (el) setSelectedRect(el.getBoundingClientRect());
              }}
              onRotateEnd={() => {}}
              requestFreshRect={() => {
                const root = previewShadowRootRef.current;
                if (!root || !selectedId) return null;
                const el = root.querySelector(
                  `[data-node-id="${CSS.escape(selectedId)}"]`
                ) as HTMLElement | null;
                return el ? el.getBoundingClientRect() : null;
              }}
            />
          )}
        </div>
      </div>
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
      <div
        className="rounded-xl border bg-card p-4 transition-all duration-200 xl:sticky xl:top-6 h-fit"
        style={{ flex: "1 1 0%" }}
      >
        <h3 className="text-base font-semibold mb-4">Inspector</h3>
        {/* Meta fields */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-muted-foreground">Component name</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background text-sm"
              value={name ?? ""}
              onChange={(e) => onMetaChange?.({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-muted-foreground">Description</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background text-sm"
              value={description ?? ""}
              onChange={(e) => onMetaChange?.({ description: e.target.value })}
            />
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {selectedNode ? (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <NodeControls
                node={selectedNode}
                onChange={(updated) => updateNode(selectedNode.id, () => updated)}
              />
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Select an element in the preview to edit its content and style.
            </motion.p>
          )}
        </AnimatePresence>
        {selectedNode && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleAddText}>
              + Text
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        )}
        {onSave && (
          <motion.div
            className="mt-6 inline-flex"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
          >
            <Button
              onClick={() =>
                toast.promise(Promise.resolve(onSave(JSON.stringify(currentTree))), {
                  loading: "Saving…",
                  success: "Saved",
                  error: "Save failed",
                })
              }
            >
              Save changes
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function renderNode(
  node: EditorNode,
  selectedId: string | null,
  setSelectedId: (id: string) => void
): React.ReactNode {
  if (node.type === "text") {
    const isSelected = node.id === selectedId;
    return (
      <span
        key={node.id}
        data-node-id={node.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(node.id);
        }}
        className={isSelected ? "ring-2 ring-primary/70 ring-offset-2 rounded-sm" : ""}
        style={convertStyle(node.style)}
      >
        {node.text}
      </span>
    );
  }

  const el = node as ElementNode;
  const Comp = el.tag as unknown as React.ElementType;
  const isSelected = el.id === selectedId;
  const className = `${el.props?.className ?? ""} ${
    isSelected ? "ring-2 ring-primary/70 ring-offset-2" : ""
  }`.trim();
  const children = el.children?.map((c, i) => (
    <span key={`${c.id}-${i}`}>{renderNode(c, selectedId, setSelectedId)}</span>
  ));

  const props: Record<string, unknown> & {
    onClick: React.MouseEventHandler;
  } = {
    "data-node-id": el.id,
    className,
    style: convertStyle(el.style),
    onClick: (e) => {
      e.stopPropagation();
      setSelectedId(el.id);
    },
  };

  return <Comp {...props}>{children}</Comp>;
}

function NodeControls({ node, onChange }: { node: EditorNode; onChange: (n: EditorNode) => void }) {
  if (node.type === "text") {
    const n = node as TextNode;
    return (
      <Tabs defaultValue="content">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1 text-muted-foreground">Text</label>
              <input
                className="w-full rounded-md border px-3 py-2 bg-background"
                value={n.text}
                onChange={(e) => onChange({ ...n, text: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="style">
          <CommonStyleControls node={n} onChange={onChange} />
        </TabsContent>
        <TabsContent value="layout">
          <LayoutControls node={n} onChange={onChange} />
        </TabsContent>
      </Tabs>
    );
  }

  const n = node as ElementNode;
  return (
    <Tabs defaultValue="style">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="style">Style</TabsTrigger>
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="tag">Tag</TabsTrigger>
      </TabsList>
      <TabsContent value="style">
        <CommonStyleControls node={n} onChange={onChange} />
      </TabsContent>
      <TabsContent value="layout">
        <LayoutControls node={n} onChange={onChange} />
      </TabsContent>
      <TabsContent value="tag">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-muted-foreground">Tag</label>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background"
              value={n.tag}
              onChange={(e) => onChange({ ...n, tag: e.target.value })}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function CommonStyleControls({
  node,
  onChange,
}: {
  node: EditorNode;
  onChange: (n: EditorNode) => void;
}) {
  const style = { ...(node.style ?? {}) } as Partial<{
    color: string;
    backgroundColor: string;
    fontSize: number | string;
    fontWeight: number | string;
    fontFamily: string;
  }>;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs mb-1 text-muted-foreground">Text Color</label>
        <input
          type="color"
          className="w-full h-9 rounded-md border bg-background"
          value={ensureColor(style.color)}
          onChange={(e) =>
            onChange({
              ...node,
              style: {
                ...style,
                color: e.target.value,
              } as unknown as ElementNode["style"],
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Padding (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={Number((style as any).padding ?? 0)}
          onChange={(e) =>
            onChange({
              ...node,
              style: {
                ...(style as any),
                padding: Number(e.target.value || 0),
              } as unknown as ElementNode["style"],
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Font Size (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={Number(style.fontSize ?? 16)}
          onChange={(e) =>
            onChange({
              ...node,
              style: {
                ...style,
                fontSize: Number(e.target.value || 0),
              } as unknown as ElementNode["style"],
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Font Family</label>
        <Select
          value={style.fontFamily ? style.fontFamily : "default"}
          onValueChange={(val) =>
            onChange({
              ...node,
              style: {
                ...style,
                fontFamily: val === "default" ? undefined : val,
              } as unknown as ElementNode["style"],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((opt) => (
              <SelectItem key={opt.label} value={opt.value}>
                <span style={{ fontFamily: opt.value === "default" ? undefined : opt.value }}>
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Bold</label>
        <button
          className={`w-full rounded-md border px-3 py-2 bg-background ${
            style.fontWeight === "bold" || Number(style.fontWeight) >= 600
              ? "bg-foreground text-background"
              : ""
          }`}
          onClick={() => {
            const current = style.fontWeight === "bold" || Number(style.fontWeight) >= 600;
            onChange({
              ...node,
              style: {
                ...style,
                fontWeight: current ? 400 : 700,
              } as unknown as ElementNode["style"],
            });
          }}
        >
          {style.fontWeight === "bold" || Number(style.fontWeight) >= 600 ? "Bold" : "Normal"}
        </button>
      </div>
      <div className="col-span-2">
        <label className="block text-xs mb-1 text-muted-foreground">Background</label>
        <input
          type="color"
          className="w-full h-9 rounded-md border bg-background"
          value={ensureColor(style.backgroundColor)}
          onChange={(e) =>
            onChange({
              ...node,
              style: {
                ...style,
                backgroundColor: e.target.value,
              } as unknown as ElementNode["style"],
            })
          }
        />
      </div>
    </div>
  );
}

function LayoutControls({
  node,
  onChange,
}: {
  node: EditorNode;
  onChange: (n: EditorNode) => void;
}) {
  const style = { ...(node.style ?? {}) } as any;
  const getNum = (v: any) => (typeof v === "number" ? v : parseInt(String(v || 0), 10) || 0);
  const getRot = (v: any) => {
    if (!v || typeof v !== "string") return 0;
    const m = v.match(/rotate\(([-+]?\d+(?:\.\d+)?)deg\)/i);
    if (m) {
      const n = parseFloat(m[1]);
      return Number.isFinite(n) ? Math.round(n) : 0;
    }
    return 0;
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Width (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={getNum(style.width)}
          onChange={(e) =>
            onChange({
              ...node,
              style: { ...(style as any), width: getNum(e.target.value) } as any,
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Height (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={getNum(style.height)}
          onChange={(e) =>
            onChange({
              ...node,
              style: { ...(style as any), height: getNum(e.target.value) } as any,
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Margin Left (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={getNum(style.marginLeft)}
          onChange={(e) =>
            onChange({
              ...node,
              style: { ...(style as any), marginLeft: getNum(e.target.value) } as any,
            })
          }
        />
      </div>
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Margin Top (px)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={getNum(style.marginTop)}
          onChange={(e) =>
            onChange({
              ...node,
              style: { ...(style as any), marginTop: getNum(e.target.value) } as any,
            })
          }
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs mb-1 text-muted-foreground">Rotation (deg)</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={getRot(style.transform)}
          onChange={(e) => {
            const deg = Math.round(parseInt(String(e.target.value || 0), 10) || 0);
            onChange({
              ...node,
              style: { ...(style as any), transform: `rotate(${deg}deg)` } as any,
            });
          }}
        />
      </div>
    </div>
  );
}

function ensureColor(value?: string) {
  if (!value) return "#000000";
  return value;
}

function convertStyle(
  style?: ElementNode["style"] | TextNode["style"]
): React.CSSProperties | undefined {
  if (!style) return undefined;
  const outStyle: React.CSSProperties = { ...(style as React.CSSProperties) };
  const fs = (style as { fontSize?: unknown }).fontSize;
  if (typeof fs === "number") outStyle.fontSize = `${fs}px`;
  return outStyle;
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
      const st = rotateRef.current;
      const dx = st ? ev.clientX - st.cx : 0;
      const dy = st ? ev.clientY - st.cy : 0;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
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
        background: "#0ea5e9",
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
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
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
      <div
        onPointerDown={startRotate}
        style={{
          position: "absolute",
          left: "50%",
          top: -28,
          marginLeft: -8,
          width: 16,
          height: 16,
          background: "#0ea5e9",
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
          background: "#0ea5e9",
          pointerEvents: "none",
        }}
      />
      {handle("nw", "nwse-resize", { left: -5, top: -5 })}
      {handle("ne", "nesw-resize", { right: -5, top: -5 })}
      {handle("sw", "nesw-resize", { left: -5, bottom: -5 })}
      {handle("se", "nwse-resize", { right: -5, bottom: -5 })}
      {handle("n", "ns-resize", { left: "50%", top: -6, marginLeft: -5 })}
      {handle("s", "ns-resize", { left: "50%", bottom: -6, marginLeft: -5 })}
      {handle("w", "ew-resize", { top: "50%", left: -6, marginTop: -5 })}
      {handle("e", "ew-resize", { top: "50%", right: -6, marginTop: -5 })}
    </div>
  );
}

function hydrateStylesFromDom(node: EditorNode, root: ShadowRoot): EditorNode {
  const extractHexFromColor = (value: string): string | null => {
    if (!value) return null;
    if (value.toLowerCase() === "transparent") return null;
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      return value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value.toLowerCase();
    }
    const rgba = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgba) {
      const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
      const r = parseInt(rgba[1], 10);
      const g = parseInt(rgba[2], 10);
      const b = parseInt(rgba[3], 10);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return null;
  };

  const query = (id: string): HTMLElement | null =>
    root.querySelector(`[data-node-id="${CSS.escape(id)}"]`) as HTMLElement | null;

  const visit = (n: EditorNode): EditorNode => {
    const el = query(n.id);
    let changed = false;
    if (el) {
      const cs = getComputedStyle(el);
      const nextStyle: any = { ...(n.style ?? {}) };
      if (nextStyle.color === undefined && cs.color) {
        const hex = extractHexFromColor(cs.color);
        if (hex) {
          nextStyle.color = hex;
          changed = true;
        }
      }
      if (nextStyle.fontSize === undefined && cs.fontSize) {
        const px = parseInt(cs.fontSize, 10);
        if (!Number.isNaN(px)) {
          nextStyle.fontSize = px;
          changed = true;
        }
      }
      if (nextStyle.fontWeight === undefined && cs.fontWeight) {
        const fw = parseInt(cs.fontWeight, 10);
        nextStyle.fontWeight = Number.isNaN(fw) ? cs.fontWeight : fw;
        changed = true;
      }
      if (nextStyle.fontFamily === undefined && cs.fontFamily) {
        const first = cs.fontFamily.split(",")[0]?.trim().replace(/^"|"$/g, "");
        if (first) {
          nextStyle.fontFamily = first;
          changed = true;
        }
      }
      if (changed) n = { ...(n as any), style: nextStyle } as EditorNode;
    }

    if (n.type === "element") {
      const children = n.children.map((c) => visit(c));
      if (children.some((c, i) => c !== n.children[i])) {
        return { ...(n as ElementNode), children } as ElementNode;
      }
    }
    return n;
  };

  return visit(node);
}

function findNode(node: EditorNode, id: string): EditorNode | null {
  if (node.id === id) return node;
  if (node.type === "element") {
    for (const child of node.children) {
      const res = findNode(child, id);
      if (res) return res;
    }
  }
  return null;
}

function updateNodeRecursive(
  node: EditorNode,
  id: string,
  updater: (n: EditorNode) => EditorNode
): EditorNode {
  if (node.id === id) return updater(node);
  if (node.type === "element") {
    const nextChildren = node.children.map((c) => updateNodeRecursive(c, id, updater));
    return {
      ...(node as ElementNode),
      children: nextChildren,
    } as ElementNode;
  }
  return node;
}

function deleteNode(node: EditorNode, id: string): EditorNode {
  if (node.type === "element") {
    const filtered = node.children.filter((c) => c.id !== id).map((c) => deleteNode(c, id));
    return { ...(node as ElementNode), children: filtered } as ElementNode;
  }
  return node;
}

function cloneNodeDeep(node: EditorNode, idGen: () => string): EditorNode {
  if (node.type === "text") {
    return { ...node, id: idGen() } as TextNode;
  }
  return {
    ...(node as ElementNode),
    id: idGen(),
    children: (node as ElementNode).children.map((c) => cloneNodeDeep(c, idGen)),
  } as ElementNode;
}

function duplicateNode(root: EditorNode, targetId: string, idGen: () => string): EditorNode {
  if (root.type !== "element") return root;
  const stack: ElementNode[] = [root as ElementNode];
  while (stack.length) {
    const cur = stack.pop() as ElementNode;
    const idx = cur.children.findIndex((c) => c.id === targetId);
    if (idx >= 0) {
      const dup = cloneNodeDeep(cur.children[idx], idGen);
      const next = [...cur.children];
      next.splice(idx + 1, 0, dup);
      cur.children = next;
      return { ...(root as ElementNode) } as ElementNode;
    }
    for (const ch of cur.children) if (ch.type === "element") stack.push(ch as ElementNode);
  }
  return root;
}

function addSiblingText(root: EditorNode, targetId: string, idGen: () => string): EditorNode {
  if (root.type !== "element") return root;
  const stack: ElementNode[] = [root as ElementNode];
  while (stack.length) {
    const cur = stack.pop() as ElementNode;
    const idx = cur.children.findIndex((c) => c.id === targetId);
    if (idx >= 0) {
      const text: TextNode = { type: "text", id: idGen(), text: "New text" };
      const next = [...cur.children];
      next.splice(idx + 1, 0, text);
      cur.children = next;
      return { ...(root as ElementNode) } as ElementNode;
    }
    for (const ch of cur.children) if (ch.type === "element") stack.push(ch as ElementNode);
  }
  return root;
}
