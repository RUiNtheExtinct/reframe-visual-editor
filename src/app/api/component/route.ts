import type { ComponentTree } from "@/lib/editorTypes";
import { createComponent, listComponents } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const items = await listComponents();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tree: ComponentTree = body.tree;
    const name: string | undefined = body.name;
    const source: string | undefined = body.source;
    if (!tree || !tree.root) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const comp = await createComponent({ tree, name, source });
    return NextResponse.json({ component: comp }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
