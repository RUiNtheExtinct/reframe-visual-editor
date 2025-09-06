import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: uuid("user_id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const components = pgTable("components", {
  componentId: uuid("component_id")
    .default(sql`gen_random_uuid()`)
    .primaryKey()
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.userId)
    .notNull(),
  name: text("name"),
  source: text("source"),
  description: text("description"),
  tree: jsonb("tree").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: text("token").primaryKey().notNull(),
  userId: uuid("user_id")
    .references(() => users.userId)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ComponentRow = typeof components.$inferSelect;
export type NewComponentRow = typeof components.$inferInsert;
