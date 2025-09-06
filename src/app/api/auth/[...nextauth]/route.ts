import { getServerAuthOptions } from "@/lib/auth";
import NextAuth from "next-auth";

const handler = NextAuth(getServerAuthOptions());

export { handler as GET, handler as POST };
