import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ComponentsClient } from "./ComponentsClient";

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.userId as string | undefined;
  if (!userId) return redirect("/sign-in");

  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(Number(pageParam ?? "1"), 1);
  const q = qParam ?? "";
  const pageSize = 10;

  return <ComponentsClient initialPage={page} initialQ={q} pageSize={pageSize} />;
}
