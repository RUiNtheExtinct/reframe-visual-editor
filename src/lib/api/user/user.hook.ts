import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "./user.service";

type UseGetCurrentUserOptions = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  retry?: boolean | number | ((failureCount: number, error: any) => boolean);
};

export const useGetCurrentUser = (options?: UseGetCurrentUserOptions) => {
  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchIntervalMs ?? (enabled ? 1000 * 60 * 5 : false);
  const retry =
    options?.retry ??
    ((failureCount: number, error: any) => {
      const status = error?.response?.status ?? error?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    });

  return useQuery<User, any, User>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await getCurrentUser();
      if (!data || !data.success) {
        throw new Error("User not found");
      }
      return data.data;
    },
    enabled,
    refetchInterval,
    retry,
  });
};
