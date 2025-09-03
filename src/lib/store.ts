import { getDb } from "@/db";
import { components } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { StoredComponent } from "./editorTypes";

export async function createComponent(
  payload: Omit<StoredComponent, "componentId" | "createdAt" | "updatedAt"> & {
    componentId?: string;
  }
): Promise<StoredComponent> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const componentId = payload.componentId ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const comp: StoredComponent = {
    componentId,
    name: payload.name,
    source: payload.source,
    description: payload.description,
    tree: payload.tree,
    createdAt: now,
    updatedAt: now,
  };
  await drizzle.insert(components).values({
    componentId,
    name: comp.name ?? (null as any),
    source: comp.source ?? (null as any),
    description: comp.description ?? (null as any),
    tree: comp.tree as any,
  });
  return comp;
}

export async function getComponent(componentId: string): Promise<StoredComponent | null> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const rows = await drizzle
    .select()
    .from(components)
    .where(eq(components.componentId, componentId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    componentId: row.componentId,
    name: row.name ?? undefined,
    source: row.source ?? undefined,
    description: (row as any).description ?? undefined,
    tree: row.tree as any,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateComponent(
  componentId: string,
  partial: Partial<Pick<StoredComponent, "name" | "source" | "description" | "tree">>
): Promise<StoredComponent | null> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const current = await getComponent(componentId);
  if (!current) return null;
  const updated: StoredComponent = { ...current, ...partial, updatedAt: new Date().toISOString() };
  await drizzle
    .update(components)
    .set({
      name: updated.name ?? (null as any),
      source: updated.source ?? (null as any),
      description: updated.description ?? (null as any),
      tree: updated.tree as any,
      updatedAt: new Date(updated.updatedAt),
    })
    .where(eq(components.componentId, componentId));
  return updated;
}

export async function listComponents(num: number = 20): Promise<StoredComponent[]> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const rows = await drizzle
    .select()
    .from(components)
    .orderBy(desc(components.updatedAt))
    .limit(num);
  return rows.map((r) => ({
    componentId: r.componentId,
    name: r.name ?? undefined,
    source: r.source ?? undefined,
    description: (r as any).description ?? undefined,
    tree: r.tree as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listComponentsPaginated(
  page: number,
  pageSize: number,
  q?: string
): Promise<{ items: StoredComponent[]; total: number; page: number; pageSize: number }> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const offset = (page - 1) * pageSize;
  // Basic ILIKE match on name/source/description
  const like = q && q.trim() ? `%${q.trim()}%` : undefined;
  const where = like
    ? (components.name as any)
        .ilike(like as any)
        .or((components.source as any).ilike(like as any))
        .or((components as any).description.ilike(like as any))
    : undefined;
  const base = drizzle.select().from(components);
  const rows = await (where ? (base as any).where(where) : base)
    .orderBy(desc(components.updatedAt))
    .limit(pageSize)
    .offset(offset);
  const countBase = drizzle
    .select({ count: (sql as any)<number>`count(*)` })
    .from(components as any);
  const countRes = await (where ? (countBase as any).where(where) : countBase);
  const total = Number((countRes as any)[0]?.count ?? 0);
  const items: StoredComponent[] = (rows as any[]).map((r) => ({
    componentId: r.componentId,
    name: r.name ?? undefined,
    source: r.source ?? undefined,
    description: (r as any).description ?? undefined,
    tree: r.tree as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { items, total, page, pageSize };
}
