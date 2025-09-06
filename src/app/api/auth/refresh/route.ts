import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: {
      accessToken: (session as any).accessToken ?? null,
      refreshToken: (session as any).refreshToken ?? null,
      expiresAt: (session as any).expiresAt ?? null,
    },
  });
}
