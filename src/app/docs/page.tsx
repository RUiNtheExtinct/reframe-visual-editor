import Image from "next/image";

export default function DocsPage() {
  return (
    <div className="min-h-screen px-6 py-10 sm:px-12 max-w-4xl mx-auto">
      <div className="relative h-48 w-full mb-8 overflow-hidden rounded-2xl border">
        <Image
          src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1920&auto=format&fit=crop"
          alt="team collaborating at laptops"
          fill
          className="object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold">Runnable Visual Editor — Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Paste any React component, preview it, and visually edit text and basic styles. Changes
        auto-save to the backend.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Getting started</h2>
        <div className="rounded-xl border bg-card p-4">
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              Run <code className="px-1 py-0.5 rounded bg-muted">pnpm install</code>
            </li>
            <li>
              Run <code className="px-1 py-0.5 rounded bg-muted">pnpm dev</code> and open{" "}
              <code className="px-1 py-0.5 rounded bg-muted">http://localhost:3000</code>
            </li>
            <li>Paste your component code and click “Parse &amp; Preview”.</li>
            <li>Click any element in the preview, then edit from the Inspector.</li>
          </ol>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Editable properties</h2>
        <div className="rounded-xl border bg-card p-4">
          <ul className="list-disc ml-5 space-y-1">
            <li>Text content</li>
            <li>Text color</li>
            <li>Font size</li>
            <li>Bold/normal</li>
            <li>Background color</li>
          </ul>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Environment</h2>
        <p className="text-sm text-muted-foreground">Create a .env with:</p>
        <pre className="text-xs rounded-md border p-3 bg-muted overflow-auto">{`DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
NEXT_PUBLIC_BASE_URL=`}</pre>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Database</h2>
        <p>
          Schema lives in <code className="px-1 py-0.5 rounded bg-muted">src/db/schema.ts</code>.
          The app only uses Postgres (Drizzle ORM).
        </p>
        <pre className="text-xs rounded-md border p-3 bg-muted overflow-auto">{`pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit push`}</pre>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">API</h2>
        <p className="text-sm text-muted-foreground">
          Responses contain the serialized component tree.
        </p>
        <div className="rounded-xl border bg-card p-4">
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
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Vercel CLI — secrets for CI</h2>
        <ol className="list-decimal ml-5 space-y-2 text-sm">
          <li>
            <code className="px-1 py-0.5 rounded bg-muted">pnpm dlx vercel login</code> then{" "}
            <code className="px-1 py-0.5 rounded bg-muted">pnpm dlx vercel whoami</code>
          </li>
          <li>
            Link the project to generate{" "}
            <code className="px-1 py-0.5 rounded bg-muted">.vercel/project.json</code>:
            <pre className="text-xs rounded-md border p-3 bg-muted overflow-auto">{`pnpm dlx vercel link
cat .vercel/project.json # includes orgId and projectId`}</pre>
          </li>
          <li>
            Generate a token at{" "}
            <a
              className="underline"
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noreferrer"
            >
              vercel.com/account/tokens
            </a>
            . Save <code className="px-1 py-0.5 rounded bg-muted">VERCEL_TOKEN</code>,{" "}
            <code className="px-1 py-0.5 rounded bg-muted">VERCEL_ORG_ID</code>,{" "}
            <code className="px-1 py-0.5 rounded bg-muted">VERCEL_PROJECT_ID</code> in GitHub
            secrets.
          </li>
        </ol>
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
