"use client";

import DeleteComponentButton from "@/components/DeleteComponentButton";
import type { StoredComponent } from "@/types/editor";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ComponentsResponse = {
  items: StoredComponent[];
  total: number;
  page: number;
  pageSize: number;
};

export function ComponentsClient({
  initialPage,
  initialQ,
  pageSize = 10,
}: {
  initialPage: number;
  initialQ: string;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState<number>(initialPage);
  const [q, setQ] = useState<string>(initialQ ?? "");
  const [debouncedQ, setDebouncedQ] = useState<string>(initialQ ?? "");

  // Debounce the query string
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handle);
  }, [q]);

  // Keep URL in sync when debounced query or page changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (debouncedQ) {
      params.set("q", debouncedQ);
    } else {
      params.delete("q");
    }
    params.set("page", String(page));
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedQ, page, pathname, router, searchParams]);

  const queryKey = useMemo(
    () => ["components", { page, pageSize, q: debouncedQ }],
    [page, pageSize, debouncedQ]
  );

  const { data, isLoading, isError } = useQuery<ComponentsResponse>({
    queryKey,
    queryFn: async () => {
      const url = new URL("/api/component", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      if (debouncedQ) url.searchParams.set("q", debouncedQ);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load components");
      return (await res.json()) as ComponentsResponse;
    },
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Components</h1>
        <div className="flex items-center gap-2">
          <input
            name="q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, source, description"
            className="rounded-md border bg-background px-3 py-2 text-sm w-72"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <div className="text-sm text-red-500">Failed to load components.</div>
      ) : (
        <>
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((c: StoredComponent) => (
              <li key={c.componentId} className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <a
                    className="text-sm font-medium truncate underline"
                    href={`/preview/${c.componentId}`}
                  >
                    {c.name ?? c.componentId}
                  </a>
                  {c.description && (
                    <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link className="text-sm underline" href={`/preview/${c.componentId}`}>
                    Open
                  </Link>
                  <DeleteComponentButton componentId={c.componentId} />
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No components found.</li>
            )}
          </ul>

          <div className="flex items-center justify-between mt-4 text-sm">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <button
                  className="rounded-md border px-3 py-1 hover:bg-accent"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
              )}
              {page < totalPages && (
                <button
                  className="rounded-md border px-3 py-1 hover:bg-accent"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
