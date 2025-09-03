"use client";

import type { ComponentTree, EditorNode, ElementNode, TextNode } from "./editorTypes";

function createId(): string {
  // Browser crypto is available both on client and server in Next
  // but this file is primarily used on the client where the user pastes code
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export async function parseJsxToTree(source: string): Promise<ComponentTree> {
  try {
    const parser = await import("@babel/parser");
    const ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });

    // Find the first JSXElement in the AST
    // We will do a very small hand-rolled traversal to stay light-weight
    let firstJsx: unknown = null;

    function walk(node: unknown) {
      if (!node || firstJsx) return;
      const n = node as { type?: string } & Record<string, unknown>;
      if (n.type === "JSXElement") {
        firstJsx = n;
        return;
      }
      for (const key of Object.keys(n)) {
        const value = (n as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          for (const v of value) walk(v);
        } else if (value && typeof value === "object") {
          walk(value);
        }
      }
    }

    walk(ast);

    if (!firstJsx) {
      return fallbackTreeFromText("Paste a valid React component that returns JSX");
    }

    const root = convertJsxNodeToEditorNode(firstJsx as unknown);
    return { root } as ComponentTree;
  } catch (err) {
    console.error("Parsing failed", err);
    return fallbackTreeFromText("Parsing failed. Showing your code as text.");
  }
}

export function serializeTreeToSource(tree: ComponentTree, componentName?: string): string {
  const name = (componentName && sanitizeComponentName(componentName)) || "Component";
  const body = serializeNode(tree.root, 2);
  const code = `export default function ${name}() {\n  return (\n${body}\n  );\n}`;
  return code;
}

function sanitizeComponentName(name: string): string {
  // Remove invalid chars and ensure it starts with a letter, then PascalCase
  const cleaned = name
    .replace(/[^a-zA-Z0-9_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return cleaned.match(/^[A-Za-z_]/) ? cleaned : `C${cleaned}`;
}

function serializeNode(node: EditorNode, indent: number): string {
  const pad = (n: number) => " ".repeat(n);
  if (node.type === "text") {
    const n = node as TextNode;
    const hasStyle = n.style && Object.keys(n.style).length > 0;
    if (hasStyle) {
      const styleSerialized = serializeStyle(n.style as NonNullable<TextNode["style"]>);
      return `${pad(indent)}<span style={{ ${styleSerialized} }}>${escapeText(n.text)}</span>`;
    }
    return `${pad(indent)}${escapeText(n.text)}`;
  }
  const n = node as ElementNode;
  const open = serializeOpeningTag(n);
  if (!n.children || n.children.length === 0) {
    return `${pad(indent)}${open}</${n.tag}>`;
  }
  const children = n.children.map((c) => serializeNode(c, indent + 2)).join("\n");
  return `${pad(indent)}${open}\n${children}\n${pad(indent)}</${n.tag}>`;
}

function escapeText(text: string): string {
  // Basic JSX text escape
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function serializeOpeningTag(node: ElementNode): string {
  const attrs: string[] = [];
  const cls = node.props?.className;
  if (cls) attrs.push(`className=\"${escapeAttribute(cls)}\"`);
  if (node.style && Object.keys(node.style).length > 0) {
    attrs.push(`style={{ ${serializeStyle(node.style)} }}`);
  }
  const attrsJoined = attrs.length ? " " + attrs.join(" ") : "";
  return `<${node.tag}${attrsJoined}>`;
}

function serializeStyle(style: NonNullable<ElementNode["style"] | TextNode["style"]>): string {
  const entries = Object.entries(style as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${formatStyleValue(v)}`);
  return entries.join(", ");
}

function formatStyleValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `\"${value}\"`;
  return '""';
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '\\"');
}

function fallbackTreeFromText(text: string): ComponentTree {
  const root: ElementNode = {
    type: "element",
    id: createId(),
    tag: "div",
    props: { className: "p-6 rounded-xl border bg-card" },
    style: {},
    children: [{ type: "text", id: createId(), text, style: { fontSize: 24, fontWeight: 600 } }],
  };
  return { root };
}

function extractStyleFromJSX(attrs: ReadonlyArray<unknown>): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  const styleAttr = (
    attrs as ReadonlyArray<{
      type?: string;
      name?: { name?: string };
      value?: { type?: string; expression?: unknown };
    }>
  ).find((a) => a.type === "JSXAttribute" && a.name?.name === "style");
  if (!styleAttr || !styleAttr.value || styleAttr.value.type !== "JSXExpressionContainer")
    return style;
  const expr = styleAttr.value.expression as
    | { type?: string; properties?: Array<unknown> }
    | undefined;
  if (expr && expr.type === "ObjectExpression") {
    for (const p of expr.properties ?? []) {
      const prop = p as {
        type?: string;
        key?: { type?: string; name?: string };
        value?: { type?: string; value?: unknown };
      };
      if (prop.type !== "ObjectProperty") continue;
      const key = prop.key?.type === "Identifier" ? prop.key.name : undefined;
      if (!key) continue;
      // simple literals only
      if (prop.value?.type === "StringLiteral" || prop.value?.type === "NumericLiteral") {
        style[key] = (prop.value as { value?: unknown }).value as unknown;
      }
    }
  }
  return style;
}

function extractClassName(attrs: ReadonlyArray<unknown>): string | undefined {
  const classAttr = (
    attrs as ReadonlyArray<{ type?: string; name?: { name?: string }; value?: unknown }>
  ).find((a) => a.type === "JSXAttribute" && a.name?.name === "className");
  if (!classAttr) return undefined;
  if (!classAttr.value) return "";
  if ((classAttr.value as { type?: string }).type === "StringLiteral")
    return (classAttr.value as { value?: string }).value as string;
  return undefined; // ignore complex expressions for simplicity
}

function convertJsxNodeToEditorNode(node: unknown): EditorNode {
  const n = node as {
    type?: string;
    value?: string;
    expression?: { type?: string; value?: string };
    openingElement?: Record<string, unknown>;
    children?: unknown[];
  };
  if (n.type === "JSXText") {
    const raw = (n.value as string) ?? "";
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length === 0) {
      return { type: "text", id: createId(), text: "" } as TextNode;
    }
    return { type: "text", id: createId(), text } as TextNode;
  }

  if (n.type === "JSXExpressionContainer") {
    // Only support string literals directly for now
    const expr = n.expression as { type?: string; value?: string } | undefined;
    if (expr?.type === "StringLiteral") {
      return { type: "text", id: createId(), text: expr.value as string } as TextNode;
    }
    return { type: "text", id: createId(), text: "" } as TextNode;
  }

  if (n.type === "JSXElement") {
    const opening = n.openingElement as {
      name: { type?: string; name?: string };
      attributes?: unknown[];
    };
    const tagName = opening.name.type === "JSXIdentifier" ? opening.name.name! : "div";
    const attrs = opening.attributes ?? [];
    const className = extractClassName(attrs);
    const style = extractStyleFromJSX(attrs);

    const children: EditorNode[] = [];
    for (const child of n.children ?? []) {
      const converted = convertJsxNodeToEditorNode(child);
      // prune empty text nodes
      if (converted.type === "text" && converted.text.trim() === "") continue;
      children.push(converted);
    }

    const el: ElementNode = {
      type: "element",
      id: createId(),
      tag: tagName,
      props: className ? { className } : undefined,
      style: style as ElementNode["style"],
      children,
    };
    return el;
  }

  // Fallback unknown nodes to text
  return { type: "text", id: createId(), text: "" } as TextNode;
}
