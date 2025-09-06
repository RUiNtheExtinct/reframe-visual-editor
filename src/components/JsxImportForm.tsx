"use client";

import CodeEditor from "@/components/CodeEditor";
import { api } from "@/lib/api/component/component.service";
import { parseJsxToTree } from "@/lib/serializer";
import { useIsAuthenticated } from "@/stores";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const SAMPLE = `
export default function Hero() {
  return (
    <section className="mx-auto max-w-3xl text-center p-12 rounded-2xl bg-white">
      <span className="inline-block text-xs tracking-widest uppercase text-gray-500">Badge</span>
      <h1 className="mt-3 text-5xl font-bold text-gray-900">TechFlow</h1>
      <p className="mt-4 text-gray-600">Hello world</p>
      <div className="mt-6 flex items-center gap-3 justify-center">
        <button className="px-4 py-2 rounded-md bg-black text-white">Start Free Trial</button>
        <button className="px-4 py-2 rounded-md border">Watch Demo</button>
      </div>
    </section>
  );
}
`;

export default function JsxImportForm() {
  const [code, setCode] = useState<string>(SAMPLE.trim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const router = useRouter();
  const isAuthed = useIsAuthenticated();

  const createMutation = useMutation({
    mutationFn: api.createComponent,
    onSuccess: (data) => {
      toast.success("Component imported");
      router.push(`/preview/${data.component.componentId}`);
    },
    onError: (err: unknown) => {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tree = await parseJsxToTree(code);
      if (!isAuthed) {
        const id = `unsaved-${crypto.randomUUID()}`;
        const payload = {
          tree,
          source: code,
          name: "Imported Component",
          description: description || undefined,
        } as const;
        sessionStorage.setItem(`reframe:unsaved:${id}`, JSON.stringify(payload));
        toast.success("Parsed");
        router.push(`/preview/${id}`);
        return;
      }
      await toast.promise(
        createMutation.mutateAsync({
          tree,
          source: code,
          name: "Imported Component",
          description: description || undefined,
        }),
        { loading: "Parsing…", success: "Parsed", error: "Parse failed" }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <label className="text-sm font-medium">Paste React component code</label>
        <div className="mt-2">
          <CodeEditor value={code} onChange={setCode} fileName="NewComponent.tsx" maxHeight={240} />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
          <input
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || createMutation.isPending}
            className="inline-flex items-center justify-center rounded-md bg-foreground text-background py-2 px-3 text-sm font-medium hover:opacity-90 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {loading || createMutation.isPending ? "Parsing…" : "Parse & Preview"}
          </button>
          <span className="text-xs text-muted-foreground">
            We support editing text, color, size and boldness.
          </span>
        </div>
      </div>
    </form>
  );
}
