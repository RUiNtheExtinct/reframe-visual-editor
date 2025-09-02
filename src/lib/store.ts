import { getDb } from "@/db";
import { components } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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
    tree: payload.tree,
    createdAt: now,
    updatedAt: now,
  };
  await drizzle
    .insert(components)
    .values({
      componentId,
      name: comp.name ?? (null as any),
      source: comp.source ?? (null as any),
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
    tree: row.tree as any,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateComponent(
  componentId: string,
  partial: Partial<Pick<StoredComponent, "name" | "source" | "tree">>
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
      tree: updated.tree as any,
      updatedAt: new Date(updated.updatedAt),
    })
    .where(eq(components.componentId, componentId));
  return updated;
}

export async function listComponents(): Promise<StoredComponent[]> {
  const drizzle = getDb();
  if (!drizzle) throw new Error("Database not configured. Set DATABASE_URL.");
  const rows = await drizzle.select().from(components).orderBy(desc(components.updatedAt));
  return rows.map((r) => ({
    componentId: r.componentId,
    name: r.name ?? undefined,
    source: r.source ?? undefined,
    tree: r.tree as any,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
