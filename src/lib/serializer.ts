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
