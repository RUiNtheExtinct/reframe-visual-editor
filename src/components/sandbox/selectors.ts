export function buildUniqueSelector(el: Element, root: ParentNode) {
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
