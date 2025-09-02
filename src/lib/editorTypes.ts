export type EditorNodeId = string;

export type TextNode = {
  type: "text";
  id: EditorNodeId;
  text: string;
  style?: Partial<{
    color: string;
    backgroundColor: string;
    fontSize: number; // px
    fontWeight: number | string; // 400 | 700 | "bold"
  }>;
};

export type ElementNode = {
  type: "element";
  id: EditorNodeId;
  tag: string; // e.g. div, h1, span, p, button
  props?: Partial<{
    className: string;
  }>;
  style?: Partial<{
    color: string;
    backgroundColor: string;
    fontSize: number; // px
    fontWeight: number | string; // 400 | 700 | "bold"
    padding: number; // px
  }>;
  children: EditorNode[];
};

export type EditorNode = ElementNode | TextNode;

export type ComponentTree = {
  root: EditorNode;
};

export type StoredComponent = {
  componentId: string;
  name?: string;
  source?: string; // original source the user pasted (optional)
  tree: ComponentTree;
  createdAt: string;
  updatedAt: string;
};
