"use client";

import { api } from "@/lib/api";
import { parseJsxToTree } from "@/lib/serializer";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: api.createComponent,
    onSuccess: (data) => {
      router.push(`/preview/${data.component.componentId}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tree = await parseJsxToTree(code);
      await createMutation.mutateAsync({ tree, source: code, name: "Imported Component" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <label className="text-sm font-medium">Paste React component code</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 w-full min-h-[280px] font-mono text-sm rounded-md border bg-background p-3"
          placeholder="Paste a function component that returns JSX..."
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
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
