import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    if (!email)
      return NextResponse.json({ success: false, message: "Email required" }, { status: 400 });
    const db = getDb();
    if (!db)
      return NextResponse.json({ success: false, message: "DB not configured" }, { status: 500 });

    const u = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    // Always return success to avoid user enumeration
    if (!u) return NextResponse.json({ success: true });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await db
      .insert(passwordResetTokens)
      .values({ token, userId: u.userId, expiresAt })
      .onConflictDoNothing();

    // In production, send email containing the reset link: `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-password error", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
