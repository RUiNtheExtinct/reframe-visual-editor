import SandboxEditor from "@/components/SandboxEditor";
import type { ComponentTree } from "@/lib/editorTypes";
import { serializeTreeToSource } from "@/lib/serializer";
import { getComponent } from "@/lib/store";

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
      <div className="mx-auto overflow-hidden rounded-2xl">
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
