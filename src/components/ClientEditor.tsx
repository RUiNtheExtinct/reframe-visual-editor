"use client";

import WebsiteEditor from "@/components/WebsiteEditor";
import { api, type UpdateComponentRequest } from "@/lib/api";
import type { ComponentTree } from "@/lib/editorTypes";
import { serializeTreeToSource } from "@/lib/serializer";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export default function ClientEditor({
  id,
  initialTree,
  initialName,
  initialDescription,
}: {
  id: string;
  initialTree: ComponentTree;
  initialName?: string;
  initialDescription?: string;
}) {
  const [status, setStatus] = useState<string>("Auto-saving");
  const [name, setName] = useState<string>(initialName ?? "");
  const [description, setDescription] = useState<string>(initialDescription ?? "");

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateComponentRequest) => api.updateComponent(id, payload),
    onMutate: () => setStatus("Saving…"),
    onSuccess: () => {
      setStatus("Saved ✔");
      setTimeout(() => setStatus("Auto-saving"), 1500);
    },
    onError: () => setStatus("Save failed"),
  });

  async function handleSave(serialized: string) {
    const parsed = JSON.parse(serialized) as ComponentTree;
    const source = serializeTreeToSource(parsed, name || "Component");
    await updateMutation.mutateAsync({
      tree: parsed,
      source,
      name: name || undefined,
      description: description || undefined,
    });
  }

  // Auto-save metadata (name/description) similar to tree autosave
  const lastMetaRef = useRef<{ name: string; description: string } | null>(null);
  useEffect(() => {
    const idTimeout = setTimeout(() => {
      const prev = lastMetaRef.current;
      if (!prev || prev.name !== name || prev.description !== description) {
        lastMetaRef.current = { name, description };
        updateMutation.mutate({ name: name || undefined, description: description || undefined });
      }
    }, 500);
    return () => clearTimeout(idTimeout);
  }, [name, description]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-background">
          <span
            className={`h-1.5 w-1.5 rounded-full ${status.startsWith("Saved") ? "bg-green-500" : status.includes("fail") ? "bg-red-500" : "bg-foreground/50"}`}
          />
          {status}
        </span>
      </div>
      <WebsiteEditor
        tree={initialTree}
        onSave={handleSave}
        autoSave
        title="Live Preview"
        name={name}
        description={description}
        onMetaChange={(partial) => {
          if (typeof partial.name === "string") setName(partial.name);
          if (typeof partial.description === "string") setDescription(partial.description);
        }}
      />
    </div>
  );
}
