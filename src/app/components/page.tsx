import { listComponentsPaginated } from "@/lib/store";
import Link from "next/link";

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(Number(pageParam ?? "1"), 1);
  const q = qParam ?? "";
  const pageSize = 10;
  const { items, total } = await listComponentsPaginated(page, pageSize, q);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Components</h1>
        <form className="flex items-center gap-2" action="/components" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, source, description"
            className="rounded-md border bg-background px-3 py-2 text-sm w-72"
          />
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Search</button>
        </form>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((c) => (
          <li key={c.componentId} className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.name ?? c.componentId}</div>
              {c.description && (
                <div className="text-xs text-muted-foreground truncate">{c.description}</div>
              )}
            </div>
            <Link className="text-sm underline" href={`/preview/${c.componentId}`}>
              Open
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between mt-4 text-sm">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link
              className="rounded-md border px-3 py-1 hover:bg-accent"
              href={`/components?page=${page - 1}&q=${encodeURIComponent(q)}`}
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              className="rounded-md border px-3 py-1 hover:bg-accent"
              href={`/components?page=${page + 1}&q=${encodeURIComponent(q)}`}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
