/* eslint-disable  @typescript-eslint/no-explicit-any */
import { getDb } from "@/db";
import { components } from "@/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { StoredComponent } from "../types/editor";

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
    userId: payload.userId,
    name: payload.name,
    source: payload.source,
    description: payload.description,
    tree: payload.tree,
    createdAt: now,
    updatedAt: now,
  };
  await drizzle.insert(components).values({
    userId: payload.userId,
    componentId,
    name: comp.name ?? (null as any),
    source: comp.source ?? (null as any),
    description: comp.description ?? (null as any),
    tree: comp.tree as any,
  });
  return comp;
}

export async function getComponent(
  componentId: string,
  userId: string | undefined | null
): Promise<StoredComponent | null> {
  if (!userId) return null;
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const rows = await drizzle
    .select()
    .from(components)
    .where(and(eq(components.componentId, componentId), eq(components.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    componentId: row.componentId,
    userId: row.userId,
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
  userId: string | undefined | null,
  partial: Partial<Pick<StoredComponent, "name" | "source" | "description" | "tree">>
): Promise<StoredComponent | null> {
  if (!userId) return null;
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const current = await getComponent(componentId, userId);
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
    .where(and(eq(components.componentId, componentId), eq(components.userId, userId)));
  return updated;
}

export async function listComponents(
  num: number = 20,
  userId: string | undefined | null
): Promise<StoredComponent[]> {
  if (!userId) return [];
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const rows = await drizzle
    .select()
    .from(components)
    .where(eq(components.userId, userId))
    .orderBy(desc(components.updatedAt))
    .limit(num);
  return rows.map((r) => ({
    componentId: r.componentId,
    userId: r.userId,
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
  userId: string,
  q?: string
): Promise<{ items: StoredComponent[]; total: number; page: number; pageSize: number }> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const offset = (page - 1) * pageSize;
  // Basic ILIKE match on name/source/description
  const like = q && q.trim() ? `%${q.trim()}%` : undefined;
  const likeWhere = like
    ? or(
        ilike(components.name, like),
        ilike(components.source, like),
        ilike(components.description as any, like as any)
      )
    : undefined;
  const filters = [eq(components.userId, userId)];
  if (likeWhere) {
    filters.push(likeWhere);
  }
  const query: any = drizzle
    .select()
    .from(components)
    .where(and(...filters));

  const rows = await query.orderBy(desc(components.updatedAt)).limit(pageSize).offset(offset);
  const countRes = await drizzle
    .select({ count: (sql as any)<number>`count(*)` })
    .from(components)
    .where(and(...filters));
  const total = Number((countRes as any)[0]?.count ?? 0);
  const items: StoredComponent[] = (rows as any[]).map((r) => ({
    componentId: r.componentId,
    userId: r.userId,
    name: r.name ?? undefined,
    source: r.source ?? undefined,
    description: (r as any).description ?? undefined,
    tree: r.tree as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { items, total, page, pageSize };
}

export async function deleteComponent(
  componentId: string,
  userId: string | undefined | null
): Promise<boolean> {
  if (!userId) return false;
  try {
    const drizzle = getDb();
    if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
    await drizzle
      .delete(components)
      .where(and(eq(components.componentId, componentId), eq(components.userId, userId)));
    return true;
  } catch (error) {
    console.error("Error deleting component", error);
    return false;
  }
}
