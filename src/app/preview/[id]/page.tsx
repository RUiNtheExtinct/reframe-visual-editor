import SandboxEditor from "@/components/SandboxEditor";
import type { ComponentTree } from "@/lib/editorTypes";
import { serializeTreeToSource } from "@/lib/serializer";
import { getComponent } from "@/lib/store";
import Link from "next/link";

async function getData(id: string) {
  const comp = await getComponent(id);
  if (!comp) return null;
  return {
    componentId: comp.componentId,
    tree: comp.tree,
    name: comp.name,
    description: comp.description,
    source: comp.source,
  } as {
    componentId: string;
    tree: ComponentTree;
    name?: string;
    description?: string;
    source?: string;
  };
}

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const comp = await getData(id);
  if (!comp) return <div className="p-8">Not found</div>;

  return (
    <div className="min-h-screen px-6 py-8 sm:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-200 ring-1 ring-red-800/60">
            Sandbox Preview
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-none truncate text-red-700 dark:text-red-100">
              Visual Editor
            </h1>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 truncate">
              Editing: {comp.name ?? comp.componentId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="text-sm underline decoration-dotted text-red-700 dark:text-red-200"
            href="/components"
          >
            Components
          </Link>
          <Link className="text-sm text-red-600 dark:text-red-400 hover:underline" href="/">
            New import
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-7xl overflow-hidden rounded-2xl">
        <SandboxEditor
          id={comp.componentId}
          initialSource={comp.source ?? serializeTreeToSource(comp.tree, comp.name)}
          initialName={comp.name}
          initialDescription={comp.description}
        />
      </div>
    </div>
  );
}
