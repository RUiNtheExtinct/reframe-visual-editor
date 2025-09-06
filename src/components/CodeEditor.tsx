"use client";

import { TAILWIND_SNIPPETS } from "@/constants";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  fileName?: string; // e.g. Component.tsx
  maxHeight?: number;
  instanceKey?: string | number;
  onSave?: () => void;
};

const Monaco = dynamic(async () => (await import("@monaco-editor/react")).default, {
  ssr: false,
  loading: () => (
    <div
      className={`h-[760px] w-full rounded-md border bg-background flex items-center justify-center text-sm text-muted-foreground`}
    >
      Loading editor…
    </div>
  ),
});

export default function CodeEditor({
  value,
  onChange,
  fileName = "Component.tsx",
  maxHeight = 760,
  instanceKey,
  onSave,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { resolvedTheme } = useTheme();

  const language = useMemo(
    () => (fileName.endsWith(".tsx") ? "typescript" : "javascript"),
    [fileName]
  );

  const maxHeightClass = useMemo(() => {
    return `max-h-[${maxHeight}px]`;
  }, [maxHeight]);

  const handleChange = useCallback((v: string | undefined) => onChange(v || ""), [onChange]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "w-full rounded-md border bg-background flex items-center justify-center text-sm text-muted-foreground",
          maxHeightClass
        )}
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
        key={instanceKey}
        height={`${maxHeight}px`}
        language={language}
        defaultLanguage={language}
        path={fileName}
        value={value}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        beforeMount={(monaco) => configureMonaco(monaco)}
        onMount={(editor, monaco) => registerEnhancements(editor, monaco, onSave, language)}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderWhitespace: "selection",
          automaticLayout: true,
          tabSize: 2,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          mouseWheelZoom: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          tabCompletion: "on",
          formatOnPaste: true,
          formatOnType: true,
          renderLineHighlight: "all",
          acceptSuggestionOnEnter: "smart",
        }}
      />
    </div>
  );
}

let __monacoConfiguredOnce = false;
function configureMonaco(monaco: any) {
  if (__monacoConfiguredOnce) return;
  const common: any = {
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxImportSource: "react",
    allowJs: true,
    allowNonTsExtensions: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeNext,
    lib: ["esnext", "dom", "dom.iterable"],
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

  // Provide sandbox global helpers typings
  const sandboxGlobalsDts = `
declare const clsx: (...args: any[]) => string;
declare const cn: (...args: any[]) => string;
declare function tw(strings: TemplateStringsArray, ...exprs: any[]): string;
`;
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    sandboxGlobalsDts,
    "file:///__sandbox_globals__.d.ts"
  );
  __monacoConfiguredOnce = true;
}

let __tailwindEnhancementsRegistered = false;
async function maybeEnableEmmet(monaco: any, editor: any) {
  // no-op placeholder for future Emmet integration
}

function registerEnhancements(editor: any, monaco: any, onSave?: () => void, language?: string) {
  // Save keybinding (Cmd/Ctrl+S)
  try {
    const KeyMod = (monaco as any).KeyMod;
    const KeyCode = (monaco as any).KeyCode;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      try {
        onSave?.();
      } catch {}
    });
  } catch {}

  // Ensure model language is correct
  try {
    const model = editor.getModel?.();
    if (model && language) {
      monaco.editor.setModelLanguage(model, language);
    }
  } catch {}

  // Optional: Emmet support
  maybeEnableEmmet(monaco, editor);

  // Try to enable Tailwind CSS IntelliSense for Monaco on the fly
  (async () => {
    try {
      const mod: any = await import("monaco-tailwindcss" as any);
      const init = mod?.init || mod?.default || mod?.initialize || mod?.setup;
      if (typeof init === "function" && !__tailwindEnhancementsRegistered) {
        try {
          init(monaco, editor, {
            // Keep default config; Tailwind v4 build still applies, this augments editor UX
          });
        } catch {
          // ignore initialization errors
        }
        __tailwindEnhancementsRegistered = true;
        return;
      }
    } catch {
      // fall back to lightweight completion below
    }

    // Fallback: lightweight Tailwind-ish className suggestions
    if (!__tailwindEnhancementsRegistered) {
      monaco.languages.registerCompletionItemProvider("typescript", {
        triggerCharacters: ['"', "'", " ", "-", ":"],
        provideCompletionItems(model: any, position: any) {
          const line = model.getLineContent(position.lineNumber);
          const upto = line.slice(0, position.column - 1);
          const isInClassName = /className\s*=\s*(\"[^\"]*|\'[^\']*|\{`[^`]*|\{\"[^\"]*)$/.test(
            upto
          );
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
      __tailwindEnhancementsRegistered = true;
    }
  })();
}
