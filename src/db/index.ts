import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (pool) return pool;
  pool = new Pool({ connectionString: url, max: 5 });
  return pool;
}

export function getDb() {
  const p = getPool();
  if (!p) return null;
  return drizzle(p);
}
