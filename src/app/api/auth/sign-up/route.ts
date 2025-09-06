import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, name, password } = body ?? {};
    if (!email || !username || !name || !password) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }
    const db = getDb();
    if (!db)
      return NextResponse.json({ success: false, message: "DB not configured" }, { status: 500 });

    const existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingByEmail[0]) {
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 409 }
      );
    }
    const existingByUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existingByUsername[0]) {
      return NextResponse.json(
        { success: false, message: "Username already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 10);
    const inserted = await db
      .insert(users)
      .values({ email, username, name, passwordHash })
      .returning();

    const u = inserted[0];
    return NextResponse.json({
      success: true,
      data: {
        userId: u.userId,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updatedAt: u.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("sign-up error", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
