"use client";

import WebsiteEditor from "@/components/WebsiteEditor";
import { api } from "@/lib/api";
import type { ComponentTree } from "@/lib/editorTypes";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export default function ClientEditor({
  id,
  initialTree,
}: {
  id: string;
  initialTree: ComponentTree;
}) {
  const [status, setStatus] = useState<string>("Auto-saving");

  const updateMutation = useMutation({
    mutationFn: (payload: { tree: ComponentTree }) => api.updateComponent(id, payload),
    onMutate: () => setStatus("Saving…"),
    onSuccess: () => {
      setStatus("Saved ✔");
      setTimeout(() => setStatus("Auto-saving"), 1200);
    },
    onError: () => setStatus("Save failed"),
  });

  async function handleSave(serialized: string) {
    await updateMutation.mutateAsync({ tree: JSON.parse(serialized) as ComponentTree });
  }

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="mb-3 text-xs text-muted-foreground">{status}</div>
      <WebsiteEditor tree={initialTree} onSave={handleSave} autoSave title="Live Preview" />
    </div>
  );
}
