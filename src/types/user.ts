import { User as NextAuthUser, Session } from "next-auth";

export interface User {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedUser extends NextAuthUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  userId?: string | null;
}

export interface ExtendedSession extends Session {
  user: ExtendedUser;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}
