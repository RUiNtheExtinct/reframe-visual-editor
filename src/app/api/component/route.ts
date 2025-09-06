import { authOptions } from "@/lib/auth";
import { createComponent, listComponentsPaginated } from "@/lib/store";
import type { ComponentTree } from "@/types/editor";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.userId as string | undefined;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const q = searchParams.get("q") ?? undefined;
  const result = await listComponentsPaginated(Math.max(page, 1), Math.max(pageSize, 1), userId, q);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.userId as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const tree: ComponentTree = body.tree;
    const name: string | undefined = body.name;
    const source: string | undefined = body.source;
    const description: string | undefined = body.description;
    if (!tree || !tree.root) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const comp = await createComponent({ tree, name, source, description, userId });
    return NextResponse.json({ component: comp }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
