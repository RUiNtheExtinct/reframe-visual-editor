"use client";

import { TAILWIND_SNIPPETS } from "@/constants";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  fileName?: string; // e.g. Component.tsx
  maxHeight?: number;
};

const Monaco = dynamic(async () => (await import("@monaco-editor/react")).default, {
  ssr: false,
  loading: () => (
    <div
      className={`h-[520px] w-full rounded-md border bg-background flex items-center justify-center text-sm text-muted-foreground`}
    >
      Loading editor…
    </div>
  ),
});

export default function CodeEditor({
  value,
  onChange,
  fileName = "Component.tsx",
  maxHeight = 520,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const language = useMemo(
    () => (fileName.endsWith(".tsx") ? "typescript" : "javascript"),
    [fileName]
  );

  if (!mounted) {
    return (
      <div
        className={`h-[${maxHeight}px] w-full rounded-md border bg-background flex items-center justify-center text-sm text-muted-foreground`}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 text-[12px] rounded-full border bg-card px-2 py-0.5 text-muted-foreground">
        {fileName}
      </div>
      <Monaco
        height={`${maxHeight}px`}
        defaultLanguage={language}
        path={fileName}
        value={value}
        onChange={(v) => onChange(v || "")}
        theme={isDark() ? "vs-dark" : "light"}
        beforeMount={(monaco) => configureMonaco(monaco)}
        onMount={(editor, monaco) => registerEnhancements(editor, monaco)}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderWhitespace: "selection",
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}

function isDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function configureMonaco(monaco: any) {
  const common: any = {
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxImportSource: "react",
    allowJs: true,
    allowNonTsExtensions: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    strict: false,
    useDefineForClassFields: false,
  };
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(common);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(common);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Provide minimal React typings to satisfy JSX runtime in the editor
  const reactJsxRuntimeDts = `
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
`;
  const reactTypesDts = `
declare module 'react' {
  export const createElement: any;
  export const Fragment: any;
}
declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any }
}
`;
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactJsxRuntimeDts,
    "file:///node_modules/@types/react/jsx-runtime.d.ts"
  );
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactTypesDts,
    "file:///node_modules/@types/react/index.d.ts"
  );
}

function registerEnhancements(editor: any, monaco: any) {
  // Basic Tailwind-ish className suggestions (lightweight heuristic)

  monaco.languages.registerCompletionItemProvider("typescript", {
    triggerCharacters: ['"', "'", " ", "-", ":"],
    provideCompletionItems(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber);
      const upto = line.slice(0, position.column - 1);
      const isInClassName = /className\s*=\s*(\"[^\"]*|\'[^\']*|\{`[^`]*|\{\"[^\"]*)$/.test(upto);
      if (!isInClassName) return { suggestions: [] };
      const suggestions = TAILWIND_SNIPPETS.map((label) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: label,
        range: undefined,
      }));
      return { suggestions };
    },
  });
}
