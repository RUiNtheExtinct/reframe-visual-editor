"use client";

import { useGetCurrentUser } from "@/lib/api";
import { useSyncUserFromSession } from "@/stores";
import { useSession } from "next-auth/react";
import { memo, useMemo } from "react";

const UserSessionSyncComponent = () => {
  const { data: session, status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);
  const { data: fullUser, error: fullUserError } = useGetCurrentUser({
    enabled: isAuthed,
  });

  useSyncUserFromSession(fullUser, fullUserError, session, status);
  return null;
};

export const UserSessionSync = memo(UserSessionSyncComponent);
