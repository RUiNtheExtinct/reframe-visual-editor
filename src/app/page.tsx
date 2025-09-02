import JsxImportForm from "@/components/JsxImportForm";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen px-6 py-10 sm:px-12">
      <header className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
            R
          </div>
          <div>
            <h1 className="text-xl font-semibold">Runable Editor</h1>
            <p className="text-xs text-muted-foreground">
              Paste any React component, then edit visually
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            className="text-sm text-muted-foreground hover:underline"
            href="https://grapesjs.com/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="transition-colors hover:text-foreground">
              Inspired by grapesjs & v0 (not bundled)
            </span>
          </a>
        </div>
      </header>

      <main className="mt-8 flex flex-col items-center">
        <section className="w-full max-w-6xl rounded-2xl border bg-gradient-to-br from-white to-muted dark:from-neutral-900 dark:to-neutral-800 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8 sm:p-12 flex flex-col justify-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Design visually. Edit instantly.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Paste a React component and fine-tune copy, colors, and layout with a refined
                editor. Primary accents in bold red with subtle greens.
              </p>
            </div>
            <div className="relative h-56 md:h-full min-h-56">
              <Image
                src="https://images.unsplash.com/photo-1556742393-d75f468bfcb0?q=80&w=1600&auto=format&fit=crop"
                alt="workspace"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
        <JsxImportForm />
      </main>
    </div>
  );
}
