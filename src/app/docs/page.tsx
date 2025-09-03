import Image from "next/image";

export default function DocsPage() {
  return (
    <div className="min-h-screen px-6 py-10 sm:px-12 max-w-4xl mx-auto">
      <div className="relative h-48 w-full mb-8 overflow-hidden rounded-2xl border">
        <Image
          src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1920&auto=format&fit=crop"
          alt="old man"
          fill
          className="object-cover"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold">Reframe — Documentation</h1>
      <p className="mt-2 text-muted-foreground">
        Reframe is a visual editor for React components. Paste JSX, preview it in an isolated
        canvas, then edit text and presentation directly via an Inspector. Changes auto-save and can
        be reopened later.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">What it is</h2>
        <div className="rounded-xl border bg-card p-4">
          <p>
            Reframe turns any React component into a live, editable canvas. It compiles your pasted
            JSX on the fly, renders it in a shadow DOM, and lets you tweak text and styling with a
            friendly Inspector—no project wiring required.
          </p>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">How to use</h2>
        <div className="rounded-xl border bg-card p-4">
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              Paste your component code on the home page and click{" "}
              <span className="px-1 py-0.5 rounded bg-muted">Parse &amp; Preview</span>.
            </li>
            <li>
              In the editor, use the <span className="px-1 py-0.5 rounded bg-muted">UI</span> tab to
              select elements in the preview. Edit text, colors, fonts, padding, borders, and
              gradients from the Inspector. Switch to the{" "}
              <span className="px-1 py-0.5 rounded bg-muted">Code</span> tab to edit TSX directly.
            </li>
            <li>
              Your changes auto-save. Reopen from the{" "}
              <code className="px-1 py-0.5 rounded bg-muted">/components</code> page. Use “Copy TSX”
              to export the current component.
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Editable properties</h2>
        <div className="rounded-xl border bg-card p-4">
          <ul className="list-disc ml-5 space-y-1">
            <li>Text content</li>
            <li>Text color and background color</li>
            <li>Font size, weight, style, and family</li>
            <li>Padding</li>
            <li>Border style, width, radius, color</li>
            <li>Text and background gradients</li>
            <li>Duplicate, delete, copy node markup</li>
            <li>Undo and redo</li>
          </ul>
        </div>
      </section>

      {/* Environment setup intentionally omitted. */}

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Technical overview</h2>
        <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
          <div>
            <div className="font-semibold">Data model</div>
            <p className="text-muted-foreground">
              Components are stored in Postgres as rows with a JSONB component tree. See{" "}
              <code className="px-1 py-0.5 rounded bg-muted">src/lib/editorTypes.ts</code> for the
              in-memory <span className="px-1 py-0.5 rounded bg-muted">ComponentTree</span> and
              <span className="px-1 py-0.5 rounded bg-muted">StoredComponent</span> types.
            </p>
          </div>
          <div>
            <div className="font-semibold">Parsing JSX</div>
            <p className="text-muted-foreground">
              <code className="px-1 py-0.5 rounded bg-muted">src/lib/serializer.ts</code> uses
              <code className="px-1 py-0.5 rounded bg-muted">@babel/parser</code> to find the first
              JSX element and convert it into a simplified tree. It extracts string literal
              <code className="px-1 py-0.5 rounded bg-muted">className</code> and simple
              <code className="px-1 py-0.5 rounded bg-muted">style</code> literals. On errors, it
              falls back to a placeholder tree.
            </p>
            <p className="text-muted-foreground mt-1">
              The reverse function{" "}
              <code className="px-1 py-0.5 rounded bg-muted">serializeTreeToSource</code>
              converts a <code className="px-1 py-0.5 rounded bg-muted">ComponentTree</code> back to
              TSX, focusing on tag, text, className, and style.
            </p>
          </div>
          <div>
            <div className="font-semibold">Live preview runtime</div>
            <p className="text-muted-foreground">
              The editor compiles pasted code with
              <code className="px-1 py-0.5 rounded bg-muted">@babel/standalone</code> and evaluates
              it inside the browser, exposing helpers like
              <code className="px-1 py-0.5 rounded bg-muted">clsx</code>,
              <code className="px-1 py-0.5 rounded bg-muted">twMerge</code>, and a
              <code className="px-1 py-0.5 rounded bg-muted">tw</code> template function. Preview is
              rendered inside a shadow DOM via
              <code className="px-1 py-0.5 rounded bg-muted">
                src/components/PreviewSurface.tsx
              </code>
              , which also wires up Twind for utility classes.
            </p>
            <p className="text-muted-foreground mt-1">
              Styles are isolated via{" "}
              <code className="px-1 py-0.5 rounded bg-muted">adoptedStyleSheets</code>
              when supported; otherwise a fallback{" "}
              <code className="px-1 py-0.5 rounded bg-muted">&lt;style&gt;</code>
              is injected. App-level styles are mirrored into the shadow root for fidelity.
            </p>
          </div>
          <div>
            <div className="font-semibold">Selection, Inspector, and overrides</div>
            <p className="text-muted-foreground">
              Clicking the preview builds a unique CSS selector for the target node. The Inspector
              writes style overrides into a special code comment
              <code className="px-1 py-0.5 rounded bg-muted">
                {"/* @reframe-overrides: {{...}} */"}
              </code>
              . Styles are applied via an injected{" "}
              <code className="px-1 py-0.5 rounded bg-muted">&lt;style&gt;</code>
              tag; text overrides are applied to DOM nodes in the shadow root. Undo/redo snapshots
              are tracked in memory.
            </p>
            <p className="text-muted-foreground mt-1">
              Bounding-box overlays are positioned relative to the preview container using client
              rects; hover/selection handlers attach inside the shadow root.
            </p>
          </div>
          <div>
            <div className="font-semibold">Auto-save and serialization</div>
            <p className="text-muted-foreground">
              Edits debounce into <code className="px-1 py-0.5 rounded bg-muted">PUT</code> calls to
              <code className="px-1 py-0.5 rounded bg-muted">/api/component/[id]</code> with both
              the updated source (including overrides) and the parsed tree. The component can be
              re-serialized back to TSX via
              <code className="px-1 py-0.5 rounded bg-muted">serializeTreeToSource</code> when
              needed.
            </p>
            <p className="text-muted-foreground mt-1">
              The save identity includes <code className="px-1 py-0.5 rounded bg-muted">name</code>
              and <code className="px-1 py-0.5 rounded bg-muted">description</code> so meta-only
              edits persist even without code changes.
            </p>
          </div>
          <div>
            <div className="font-semibold">Storage and API</div>
            <p className="text-muted-foreground">
              Database access is through Drizzle in
              <code className="px-1 py-0.5 rounded bg-muted">src/lib/store.ts</code>. Routes live at
              <code className="px-1 py-0.5 rounded bg-muted">/api/component</code> for create/list
              and <code className="px-1 py-0.5 rounded bg-muted">/api/component/[id]</code> for
              fetch/update/delete.
            </p>
            <p className="text-muted-foreground mt-1">
              Listing supports pagination and ILIKE search across name, source, and description.
            </p>
          </div>
          <div>
            <div className="font-semibold">Known limitations</div>
            <ul className="list-disc ml-5 text-muted-foreground">
              <li>Parses the first JSX element only; complex code is simplified.</li>
              <li>
                Supports simple string/number{" "}
                <code className="px-1 py-0.5 rounded bg-muted">style</code> literals and string{" "}
                <code className="px-1 py-0.5 rounded bg-muted">className</code> only.
              </li>
              <li>JS expressions in text are not evaluated (except string literals).</li>
              <li>User code executes in-page; isolation is via shadow DOM (not a VM sandbox).</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">Editor integration</div>
            <p className="text-muted-foreground">
              The code editor uses Monaco with a lightweight TS/JS configuration and optional
              Tailwind IntelliSense (falls back to keyword completion when unavailable).
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">API</h2>
        <p className="text-sm text-muted-foreground">
          Responses contain the serialized component tree.
        </p>
        <div className="rounded-xl border bg-card p-4">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              <code className="px-1 py-0.5 rounded bg-muted">
                GET /api/component?page=1&pageSize=10&q=
              </code>{" "}
              → list components ({"{"} items, total, page, pageSize {"}"})
            </li>
            <li>
              <code className="px-1 py-0.5 rounded bg-muted">POST /api/component</code> → create
              component ({"{"} tree, name?, source?, description? {"}"})
            </li>
            <li>
              <code className="px-1 py-0.5 rounded bg-muted">GET /api/component/[id]</code> → fetch
              component
            </li>
            <li>
              <code className="px-1 py-0.5 rounded bg-muted">PUT /api/component/[id]</code> → update
              component ({"{"} tree?, name?, source?, description? {"}"})
            </li>
            <li>
              <code className="px-1 py-0.5 rounded bg-muted">DELETE /api/component/[id]</code> →
              delete component
            </li>
          </ul>
        </div>
      </section>

      {/* Local run scripts intentionally omitted. */}

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Pre-commit formatting</h2>
        <p className="text-sm text-muted-foreground">
          Husky + lint-staged run Prettier and ESLint on changed files.
        </p>
      </section>
    </div>
  );
}
