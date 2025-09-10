"use client";

import SandboxEditor from "@/components/SandboxEditor";
import { DEFAULT_SNIPPET } from "@/components/sandbox/defaults";
import { useDraftById } from "@/stores/draft.store";

export default function UnsavedPreviewClient({ id }: { id: string }) {
  const draft = useDraftById(id);
  const initial = {
    source: draft?.source || DEFAULT_SNIPPET,
    name: draft?.name || "Untitled",
    description: draft?.description || "",
  };

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
