import JsxImportForm from "@/components/JsxImportForm";
import { listComponents } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const top = await listComponents(6);

  return (
    <div className="min-h-screen px-6 py-10 sm:px-12">
      <main className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border bg-card">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-8 sm:p-12 flex flex-col justify-center">
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-foreground ring-1 ring-accent/30">
                Reframe — Visual React editor
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
                Turn any React component into a live canvas.
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Paste your JSX, select any element, and edit copy, colors, and layout—right on the
                component. Real React, instant preview, zero setup.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="#import"
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Paste your component
                </Link>
                <span className="text-sm text-muted-foreground">
                  Inspired by{" "}
                  <a
                    className="underline decoration-dotted hover:text-foreground"
                    href="https://grapesjs.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GrapesJS
                  </a>{" "}
                  and{" "}
                  <a
                    className="underline decoration-dotted hover:text-foreground"
                    href="https://v0.dev/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    v0
                  </a>
                </span>
              </div>
            </div>
            <div className="relative h-64 md:h-full min-h-64">
              <Image
                src="https://images.unsplash.com/photo-1529101091764-c3526daf38fe?q=80&w=1920&auto=format&fit=crop"
                alt="UI design workspace"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Import form */}
        <div id="import" className="mt-8">
          <JsxImportForm />
        </div>

        {/* Recent components */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Components
            </h3>
            <Link href="/components" className="text-sm underline">
              View all
            </Link>
          </div>
          {top.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No components yet. Paste one above to get started.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {top.map((c) => (
                <li
                  key={c.componentId}
                  className="group overflow-hidden rounded-xl border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="p-4 flex flex-col">
                    <a
                      className="font-medium truncate group-hover:text-foreground/90"
                      href={`/preview/${c.componentId}`}
                    >
                      {c.name ?? c.componentId}
                    </a>

                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.description ?? "N/A"}
                    </div>

                    <Link
                      className="mt-3 inline-flex text-sm underline decoration-dotted"
                      href={`/preview/${c.componentId}`}
                    >
                      Open in editor
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
