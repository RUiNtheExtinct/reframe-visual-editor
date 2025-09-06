"use client";

import SandboxEditor from "@/components/SandboxEditor";
import { DEFAULT_SNIPPET } from "@/components/sandbox/defaults";
import { useEffect, useMemo, useState } from "react";

export default function UnsavedPreviewClient({ id }: { id: string }) {
  const storageKey = useMemo(() => `reframe:unsaved:${id}`, [id]);
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<{
    source?: string;
    name?: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setInitial({
          source: parsed?.source || DEFAULT_SNIPPET,
          name: parsed?.name || "Untitled",
          description: parsed?.description || "",
        });
      } else {
        setInitial({ source: DEFAULT_SNIPPET, name: "Untitled", description: "" });
      }
    } catch {
      setInitial({ source: DEFAULT_SNIPPET, name: "Untitled", description: "" });
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  if (!loaded || !initial) return <div className="p-8">Loading preview…</div>;

  return (
    <div className="min-h-screen px-6 py-8 sm:px-12">
      <div className="mx-auto overflow-hidden rounded-2xl">
        <SandboxEditor
          id={id}
          initialSource={initial.source}
          initialName={initial.name}
          initialDescription={initial.description}
        />
      </div>
    </div>
  );
}
