import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const components = pgTable("components", {
  componentId: uuid("component_id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  name: text("name"),
  source: text("source"),
  description: text("description"),
  tree: jsonb("tree").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export type ComponentRow = typeof components.$inferSelect;
export type NewComponentRow = typeof components.$inferInsert;
