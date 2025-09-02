import ClientEditor from "@/components/ClientEditor";
import ThemeToggle from "@/components/ThemeToggle";
import type { ComponentTree } from "@/lib/editorTypes";
import { getComponent } from "@/lib/store";
import Link from "next/link";

async function getData(id: string) {
  const comp = await getComponent(id);
  if (!comp) return null;
  return { componentId: comp.componentId, tree: comp.tree, name: comp.name } as {
    componentId: string;
    tree: ComponentTree;
    name?: string;
  };
}

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const comp = await getData(params.id);
  if (!comp) return <div className="p-8">Not found</div>;

  return (
    <div className="min-h-screen px-6 py-10 sm:px-12">
      <header className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
            R
          </div>
          <div>
            <h1 className="text-xl font-semibold">Visual Editor</h1>
            <p className="text-xs text-muted-foreground">
              Editing: {comp.name ?? comp.componentId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link className="text-sm text-muted-foreground hover:underline" href="/">
            New import
          </Link>
        </div>
      </header>

      {/* Client wrapper for editing */}
      <ClientEditor id={comp.componentId} initialTree={comp.tree} />
    </div>
  );
}
