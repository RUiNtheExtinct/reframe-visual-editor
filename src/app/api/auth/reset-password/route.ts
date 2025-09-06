import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Token and password required" },
        { status: 400 }
      );
    }
    const db = getDb();
    if (!db)
      return NextResponse.json({ success: false, message: "DB not configured" }, { status: 500 });

    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    const pr = rows[0];
    if (!pr)
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 400 });
    if (pr.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: "Token expired" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.userId, pr.userId));
    // Invalidate token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset-password error", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
