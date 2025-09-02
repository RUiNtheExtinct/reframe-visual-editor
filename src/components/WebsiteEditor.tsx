"use client";

import type { ComponentTree, EditorNode, ElementNode, TextNode } from "@/lib/editorTypes";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

type WebsiteEditorProps = {
  tree: ComponentTree;
  onChange?: (tree: ComponentTree) => void;
  onSave?: (serialized: string) => void;
  autoSave?: boolean;
  title?: string;
};

export default function WebsiteEditor({
  tree,
  onChange,
  onSave,
  autoSave = true,
  title,
}: WebsiteEditorProps) {
  const [currentTree, setCurrentTree] = useState<ComponentTree>(tree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => (selectedId ? findNode(currentTree.root, selectedId) : null),
    [currentTree, selectedId]
  );

  useEffect(() => setCurrentTree(tree), [tree]);

  useEffect(() => {
    onChange?.(currentTree);
    if (!autoSave || !onSave) return;
    const id = setTimeout(() => onSave(JSON.stringify(currentTree)), 600);
    return () => clearTimeout(id);
  }, [currentTree, autoSave, onSave, onChange]);

  const updateNode = useCallback((id: string, updater: (node: EditorNode) => EditorNode) => {
    setCurrentTree((prev) => ({
      root: updateNodeRecursive(prev.root, id, updater),
    }));
  }, []);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100dvh-140px)]">
      <div className="col-span-8 rounded-xl border bg-card p-3 overflow-auto transition-shadow duration-200 hover:shadow-lg">
        <div className="flex items-center justify-between px-1 py-2">
          <h2 className="text-sm font-medium text-muted-foreground">{title ?? "Preview"}</h2>
          <div className="text-xs text-muted-foreground">Click elements to edit</div>
        </div>
        <motion.div
          className="rounded-lg border bg-background p-6 min-h-[480px] transition-colors"
          layout
        >
          {renderNode(currentTree.root, selectedId, setSelectedId)}
        </motion.div>
      </div>
      <div className="col-span-4 rounded-xl border bg-card p-4 transition-all duration-200">
        <h3 className="text-base font-semibold mb-4">Inspector</h3>
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
        {onSave && (
          <motion.button
            className="mt-6 inline-flex items-center justify-center rounded-md bg-foreground text-background py-2 px-3 text-sm font-medium"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onSave(JSON.stringify(currentTree))}
          >
            Save changes
          </motion.button>
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
        className={isSelected ? "ring-2 ring-blue-500 ring-offset-2 rounded-sm" : ""}
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
    isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
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
