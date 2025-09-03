import ClientEditor from "@/components/ClientEditor";
import type { ComponentTree } from "@/lib/editorTypes";
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
  } as {
    componentId: string;
    tree: ComponentTree;
    name?: string;
    description?: string;
  };
}

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const comp = await getData(params.id);
  if (!comp) return <div className="p-8">Not found</div>;

  return (
    <div className="min-h-screen px-6 py-8 sm:px-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-foreground ring-1 ring-accent/30">
            Preview
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-none truncate">Visual Editor</h1>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              Editing: {comp.name ?? comp.componentId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline decoration-dotted" href="/components">
            Components
          </Link>
          <Link className="text-sm text-muted-foreground hover:underline" href="/">
            New import
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-6xl overflow-hidden rounded-2xl">
        <ClientEditor
          id={comp.componentId}
          initialTree={comp.tree}
          initialName={comp.name}
          initialDescription={comp.description}
        />
      </div>
    </div>
  );
}
