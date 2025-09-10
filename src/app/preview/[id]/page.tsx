import UnsavedPreviewClient from "@/components/sandbox/UnsavedPreviewClient";
import SandboxEditor from "@/components/SandboxEditor";
import { authOptions } from "@/lib/auth";
import { serializeTreeToSource } from "@/lib/serializer";
import { getComponent } from "@/lib/store";
import type { ComponentTree } from "@/types/editor";
import { getServerSession } from "next-auth";

async function getData(id: string, userId: string | undefined | null) {
  if (id.startsWith("unsaved-")) {
    return null;
  }
  const comp = await getComponent(id, userId);
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
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.userId as string | undefined;

  const { id } = await params;

  const comp = await getData(id, userId);

  if (!comp || id.startsWith("unsaved-")) {
    return <UnsavedPreviewClient id={id} />;
  }

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
