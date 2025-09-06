import { authOptions } from "@/lib/auth";
import { deleteComponent, getComponent, updateComponent } from "@/lib/store";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comp = await getComponent(id, userId);
  if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comp.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ component: comp });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.userId as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id } = await params;
    const existing = await getComponent(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const updated = await updateComponent(id, userId, {
      tree: body.tree,
      name: body.name,
      source: body.source,
      description: body.description,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ component: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.userId as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const existing = await getComponent(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const ok = await deleteComponent(id, userId);
    if (!ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
