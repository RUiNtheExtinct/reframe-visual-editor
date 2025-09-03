"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onShadowRootReady?: (root: ShadowRoot | null) => void;
};

export default function PreviewSurface({ children, className, style, onShadowRootReady }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    let root = (host as any).shadowRoot as ShadowRoot | null;
    if (!root) {
      root = host.attachShadow({ mode: "open" });
    }
    setShadowRoot(root);
    try {
      onShadowRootReady?.(root);
    } catch {}
    let mount = root.querySelector(':scope > div[data-preview-mount="1"]') as HTMLDivElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-preview-mount", "1");
      root.appendChild(mount);
    }
    setMountNode(mount);

    let disconnect: (() => void) | undefined;
    (async () => {
      try {
        // Bring existing app styles into the shadow DOM once
        if (!root.querySelector('style[data-copied-from-doc], link[rel="stylesheet"]')) {
          const styleNodes = Array.from(
            document.head.querySelectorAll('style, link[rel="stylesheet"]')
          ) as (HTMLStyleElement | HTMLLinkElement)[];
          for (const node of styleNodes) {
            if (node.tagName === "STYLE") {
              const cloned = document.createElement("style");
              cloned.setAttribute("data-copied-from-doc", "1");
              cloned.textContent = (node as HTMLStyleElement).textContent;
              root.appendChild(cloned);
            } else if (node.tagName === "LINK") {
              const cloned = document.createElement("link");
              cloned.setAttribute("rel", "stylesheet");
              const href = (node as HTMLLinkElement).getAttribute("href");
              if (href) cloned.setAttribute("href", href);
              root.appendChild(cloned);
            }
          }
        }

        const twind = (await import("twind")) as typeof import("twind");
        const observeMod = (await import("twind/observe")) as typeof import("twind/observe");

        // Use Constructable Stylesheets when available for shadow DOM
        let targetSheet: CSSStyleSheet | undefined;
        if (typeof window !== "undefined" && (root as any).adoptedStyleSheets) {
          targetSheet = new CSSStyleSheet();
          (root as any).adoptedStyleSheets = [targetSheet];
        } else {
          // Fallback: ensure a <style> exists so the browser creates a sheet for this shadow root
          const styleEl = document.createElement("style");
          root.appendChild(styleEl);
          targetSheet = undefined;
        }

        if (!(root as any).__twindReady) {
          const sheet = targetSheet
            ? twind.cssomSheet({ target: targetSheet })
            : twind.cssomSheet();
          const { tw } = twind.create({ darkMode: "class", sheet });
          const obs = observeMod.createObserver({ tw }).observe(root as unknown as Node);
          disconnect = () => obs.disconnect();
          (root as any).__twindReady = true;
        }
      } catch {
        // ignore runtime errors; preview will just render unstyled
      }
    })();

    return () => {
      try {
        disconnect?.();
      } finally {
        setMountNode(null);
        try {
          onShadowRootReady?.(null);
        } catch {}
      }
    };
  }, []);

  return (
    <div ref={hostRef} className={className} style={style}>
      {shadowRoot && mountNode ? createPortal(children, mountNode) : null}
    </div>
  );
}
