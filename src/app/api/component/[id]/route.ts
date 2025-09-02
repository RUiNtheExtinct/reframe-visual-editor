import { getComponent, updateComponent } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comp = await getComponent(id);
  if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ component: comp });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    const updated = await updateComponent(id, {
      tree: body.tree,
      name: body.name,
      source: body.source,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ component: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
