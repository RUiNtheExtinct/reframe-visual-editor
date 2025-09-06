import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./component.service";

// Save mutations
export const updateUpdateComponentMutation = (
  id: string,
  setStatus: (status: string) => void,
  userId: string | null | undefined
) => {
  return useMutation({
    mutationFn: (payload: { source: string; tree?: any; name?: string; description?: string }) => {
      if (!userId) {
        toast.error("Please login to save your changes");
        throw new Error("Please login to save your changes");
      }
      return api.updateComponent(id, payload);
    },
    onMutate: () => setStatus("Saving…"),
    onSuccess: () => {
      setStatus("Saved ✔");
      setTimeout(() => setStatus("Auto-saving"), 1500);
    },
    onError: () => setStatus("Save failed"),
  });
};
