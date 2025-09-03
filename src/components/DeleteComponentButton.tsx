"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DeleteComponentButton({ componentId }: { componentId: string }) {
  const router = useRouter();

  const onDelete = async () => {
    const t = toast.loading("Deleting…");
    try {
      const res = await fetch(`/api/component/${encodeURIComponent(componentId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Deleted");
      router.refresh();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      toast.dismiss(t);
    }
  };

  return (
    <button
      onClick={onDelete}
      className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-orange-200"
      aria-label="Delete component"
      title="Delete"
    >
      <Trash2 className="size-4 text-red-500 hover:scale-110 transition-transform duration-300 ease-in-out" />
    </button>
  );
}
