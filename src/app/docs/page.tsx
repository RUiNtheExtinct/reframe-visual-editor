export default function DocsPage() {
  return (
    <div className="min-h-screen px-6 py-10 sm:px-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Runable Visual Editor — Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Paste any React component, preview it, and visually edit text and basic styles. Changes
        auto-save to the backend.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Getting started</h2>
        <ol className="list-decimal ml-5 space-y-2">
          <li>
            Run <code className="px-1 py-0.5 rounded bg-muted">pnpm install</code>
          </li>
          <li>
            Run <code className="px-1 py-0.5 rounded bg-muted">pnpm dev</code> and open{" "}
            <code className="px-1 py-0.5 rounded bg-muted">http://localhost:3000</code>
          </li>
          <li>Paste your component code and click “Parse & Preview”.</li>
          <li>Click any element in the preview, then edit from the Inspector.</li>
        </ol>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Editable properties</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Text content</li>
          <li>Text color</li>
          <li>Font size</li>
          <li>Bold/normal</li>
          <li>Background color</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">API</h2>
        <p className="text-sm text-muted-foreground">
          Responses contain the serialized component tree.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">POST /api/component</code> → create
            component
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">GET /api/component/[id]</code> → fetch
            component
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">PUT /api/component/[id]</code> → update
            component
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Scripts</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm dev</code> — run locally
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm build</code> — production build
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm lint</code> /{" "}
            <code className="px-1 py-0.5 rounded bg-muted">pnpm lint:fix</code>
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm typecheck</code>
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm format</code> — Prettier
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Pre-commit formatting</h2>
        <p className="text-sm text-muted-foreground">
          Husky + lint-staged run Prettier and ESLint on changed files.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">CI/CD (Vercel)</h2>
        <p>
          On push to <code className="px-1 py-0.5 rounded bg-muted">main</code>, GitHub Actions
          builds and deploys to Vercel.
        </p>
        <p className="text-sm text-muted-foreground">Set these repository secrets:</p>
        <ul className="list-disc ml-5 text-sm">
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">VERCEL_TOKEN</code>
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">VERCEL_ORG_ID</code>
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">VERCEL_PROJECT_ID</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
