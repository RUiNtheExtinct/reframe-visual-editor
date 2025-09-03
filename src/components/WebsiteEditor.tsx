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
import { FONT_OPTIONS } from "@/constants";
import type { ComponentTree, EditorNode, ElementNode, TextNode } from "@/lib/editorTypes";
import { parseJsxToTree, serializeTreeToSource } from "@/lib/serializer";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
  const selectedNode = useMemo(
    () => (selectedId ? findNode(currentTree.root, selectedId) : null),
    [currentTree, selectedId]
  );

  useEffect(() => setCurrentTree(tree), [tree]);
  // Keep code in sync when not actively editing code
  useEffect(() => {
    if (activeTab !== "code") {
      setCode(serializeTreeToSource(currentTree, name));
    }
  }, [currentTree, name, activeTab]);

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
      } catch {
        // Ignore parse errors silently; the import function already handles toast on failure
      }
    }, 500);
    return () => clearTimeout(id);
  }, [code, activeTab]);

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
    setCurrentTree((prev) => ({ root: deleteNode(prev.root, selectedId) }));
    setSelectedId(null);
    toast.success("Deleted element");
  }, [selectedId]);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    setCurrentTree((prev) => ({ root: duplicateNode(prev.root, selectedId, generateId) }));
    toast.success("Duplicated element");
  }, [selectedId]);

  const handleAddText = useCallback(() => {
    if (!selectedId) return;
    setCurrentTree((prev) => ({ root: addSiblingText(prev.root, selectedId, generateId) }));
    toast.success("Added text element");
  }, [selectedId]);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6 h-[calc(100dvh-140px)] px-1">
      <div className="col-span-12 lg:col-span-8 rounded-xl border bg-card p-3 overflow-auto transition-shadow duration-200 hover:shadow-lg">
        <div className="flex items-center justify-between px-1 py-2">
          <h2 className="text-sm font-medium text-muted-foreground">{title ?? "Preview"}</h2>
          <div className="flex items-center gap-2">
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
                const src = activeTab === "code" ? code : serializeTreeToSource(currentTree, name);
                await navigator.clipboard.writeText(src);
                toast.success("Copied component TSX");
              }}
            >
              Copy TSX
            </Button>
          </div>
        </div>
        <motion.div className="rounded-lg border bg-background p-0 transition-colors" layout>
          {activeTab === "design" ? (
            <div className="p-6 min-h-[520px]">
              <div className="text-xs text-muted-foreground mb-2">Click elements to edit</div>
              {renderNode(currentTree.root, selectedId, setSelectedId)}
            </div>
          ) : (
            <div className="p-2">
              <CodeEditor
                value={code}
                onChange={setCode}
                fileName={`${(name || "Component").replace(/\s+/g, "")}.tsx`}
              />
            </div>
          )}
        </motion.div>
      </div>
      <div className="col-span-12 lg:col-span-4 rounded-xl border bg-card p-4 transition-all duration-200 lg:sticky lg:top-6 h-fit">
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
      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1 text-muted-foreground">Text</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-background"
            value={n.text}
            onChange={(e) => onChange({ ...n, text: e.target.value })}
          />
        </div>
        <CommonStyleControls node={n} onChange={onChange} />
      </div>
    );
  }

  const n = node as ElementNode;
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs mb-1 text-muted-foreground">Tag</label>
        <input
          className="w-full rounded-md border px-3 py-2 bg-background"
          value={n.tag}
          onChange={(e) => onChange({ ...n, tag: e.target.value })}
        />
      </div>
      <CommonStyleControls node={n} onChange={onChange} />
    </div>
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
