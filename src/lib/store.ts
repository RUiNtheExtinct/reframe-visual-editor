import { promises as fs } from "fs";
import path from "path";
import type { StoredComponent } from "./editorTypes";

const DB_FILE = path.join(process.cwd(), "components.json");

type DBShape = {
  components: Record<string, StoredComponent>;
};

async function readDb(): Promise<DBShape> {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(data) as DBShape;
    if (!parsed.components) return { components: {} };
    return parsed;
  } catch (err) {
    console.error(err);
    return { components: {} };
  }
}

async function writeDb(db: DBShape): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function createComponent(
  payload: Omit<StoredComponent, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<StoredComponent> {
  const db = await readDb();
  const id = payload.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const comp: StoredComponent = {
    id,
    name: payload.name,
    source: payload.source,
    tree: payload.tree,
    createdAt: now,
    updatedAt: now,
  };
  db.components[id] = comp;
  await writeDb(db);
  return comp;
}

export async function getComponent(id: string): Promise<StoredComponent | null> {
  const db = await readDb();
  return db.components[id] ?? null;
}

export async function updateComponent(
  id: string,
  partial: Partial<Pick<StoredComponent, "name" | "source" | "tree">>
): Promise<StoredComponent | null> {
  const db = await readDb();
  const existing = db.components[id];
  if (!existing) return null;
  const updated: StoredComponent = { ...existing, ...partial, updatedAt: new Date().toISOString() };
  db.components[id] = updated;
  await writeDb(db);
  return updated;
}

export async function listComponents(): Promise<StoredComponent[]> {
  const db = await readDb();
  return Object.values(db.components).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
