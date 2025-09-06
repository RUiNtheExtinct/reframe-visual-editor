/* eslint-disable  @typescript-eslint/no-explicit-any */
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function useCompiledComponent(
  code: string,
  _overridesRef: React.MutableRefObject<any>,
  setError: (msg: string | null) => void
) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCompileError(null);
        setError(null);
        const mod = await import("@babel/standalone");
        const processed = preprocessUserCode(code);
        const compiled = mod.transform(processed, {
          presets: [
            ["react", { runtime: "classic", pragma: "React.createElement" }],
            ["typescript", { allowDeclareFields: true, allowNamespaces: true }],
          ],
          filename: "sandbox-component.tsx",
          sourceType: "script",
        }).code as string;

        const prelude = `
          const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useReducer, useContext, createContext, forwardRef, useImperativeHandle, Fragment } = React;
          const clsx = __clsx;
          const cn = (...args) => __twMerge(clsx(...args));
          const tw = (strings, ...exprs) => {
            try {
              const parts = [];
              for (let i = 0; i < strings.length; i++) {
                parts.push(strings[i]);
                if (i < exprs.length) parts.push(String(exprs[i] ?? ""));
              }
              return cn(parts.join(" "));
            } catch { return ""; }
          };
        `;
        const factory = new Function(
          "React",
          "__clsx",
          "__twMerge",
          `${prelude}\n${compiled}\n;return (typeof __returnComponent__ !== 'undefined' ? __returnComponent__ : null);`
        );
        const result = factory(React, clsx, twMerge);
        if (!cancelled) setComponent(() => result);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          const msg = err?.message || "Compile error";
          setCompileError(msg);
          setError(msg);
          setComponent(() => null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    // no-op: overrides are injected via <style> in preview
  }, [_overridesRef.current]);

  return { Component, compileError } as {
    Component: React.ComponentType<any> | null;
    compileError: string | null;
  };
}

export function preprocessUserCode(input: string): string {
  // Strip imports/exports, detect main component and expose it as __returnComponent__
  let src = input
    .replace(/^[\t ]*import[^\n]*$/gm, "")
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ");

  const nameFromDefault = matchFirst(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/, src);
  const arrowName =
    matchFirst(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/, src) ||
    matchFirst(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*[^=]*=>/, src);
  const compName =
    nameFromDefault ||
    arrowName ||
    matchFirst(/class\s+([A-Z][A-Za-z0-9_]*)\s+/, src) ||
    "Component";

  if (!src.includes("__returnComponent__")) {
    src += `\n;var __returnComponent__ = typeof ${compName} !== 'undefined' ? ${compName} : null;`;
  }
  return src;
}

export function matchFirst(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return (m && m[1]) || null;
}
