import { getDb } from "@/db";
import { users } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db)
    return NextResponse.json({ success: false, message: "DB not configured" }, { status: 500 });
  const userId = (session.user as any).userId as string;
  const rows = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
  const u = rows[0];
  if (!u) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({
    success: true,
    data: {
      userId: u.userId,
      email: u.email,
      name: u.name,
      image: u.image,
      createdAt: u.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: u.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    },
  });
}
