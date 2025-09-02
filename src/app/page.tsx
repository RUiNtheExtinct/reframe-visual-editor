import JsxImportForm from "@/components/JsxImportForm";
import ThemeToggle from "@/components/ThemeToggle";

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
        <JsxImportForm />
      </main>
    </div>
  );
}
