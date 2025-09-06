import { getDb } from "@/db";
import { users } from "@/db/schema";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

type DbUser = typeof users.$inferSelect;

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

async function findUserByUsername(username: string): Promise<DbUser | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] ?? null;
}

function toSafeUser(u: DbUser): NextAuthUser & { userId: string } {
  return {
    id: u.userId,
    userId: u.userId,
    name: u.name,
    email: u.email,
    image: u.image ?? undefined,
  } as any;
}

async function generateUsernameFromEmail(
  email?: string | null,
  fallback?: string | null
): Promise<string> {
  const base = (email?.split("@")[0] || fallback || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "");
  const db = getDb();
  if (!db) return `${base}_${Math.floor(Math.random() * 10000)}`;
  let candidate = base;
  let counter = 0;
  // Ensure uniqueness
   
  while (true) {
    const exists = await findUserByUsername(candidate);
    if (!exists) return candidate;
    counter += 1;
    candidate = `${base}${counter}`;
  }
}

async function createUser(params: {
  email: string;
  name: string;
  username: string;
  passwordHash?: string | null;
  image?: string | null;
}): Promise<DbUser> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const values = {
    email: params.email,
    name: params.name,
    username: params.username,
    passwordHash: params.passwordHash ?? null,
    image: params.image ?? null,
  } as const;
  const inserted = await db.insert(users).values(values).returning();
  return inserted[0];
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        emailOrUsername: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const emailOrUsername = credentials?.emailOrUsername?.toString().trim() || "";
        const password = credentials?.password?.toString() || "";
        if (!emailOrUsername || !password) return null;

        const byEmail = emailOrUsername.includes("@");
        const dbUser = byEmail
          ? await findUserByEmail(emailOrUsername)
          : await findUserByUsername(emailOrUsername);
        if (!dbUser || !dbUser.passwordHash) return null;

        const ok = await compare(password, dbUser.passwordHash);
        if (!ok) return null;
        return toSafeUser(dbUser);
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Ensure our DB has a matching user for OAuth logins
      if (account && account.provider !== "credentials") {
        const email = user.email || (profile as any)?.email;
        if (!email) return false;
        let dbUser = await findUserByEmail(email);
        if (!dbUser) {
          const username = await generateUsernameFromEmail(email, user.name);
          dbUser = await createUser({
            email,
            name: user.name || email.split("@")[0],
            username,
            image: user.image ?? null,
          });
        }
        (user as any).userId = dbUser.userId;
      } else if (account?.provider === "credentials") {
        // user already mapped in authorize
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Attach our user id and simple token fields
      if (user) {
        token.userId = (user as any).userId || user.id;
      }
      // Simple rolling expiry (1 hour)
      const nowSec = Math.floor(Date.now() / 1000);
      token.expiresAt = nowSec + 60 * 60;
      token.accessToken = token.accessToken || crypto.randomUUID();
      token.refreshToken = token.refreshToken || crypto.randomUUID();
      return token;
    },
    async session({ session, token }) {
      (session.user as any).userId = (token as any).userId || null;
      (session as any).accessToken = (token as any).accessToken || null;
      (session as any).refreshToken = (token as any).refreshToken || null;
      (session as any).expiresAt = (token as any).expiresAt || null;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
};

export function getServerAuthOptions(): NextAuthOptions {
  return authOptions;
}
