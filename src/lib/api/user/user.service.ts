import { axiosClient } from "@/lib/api/axios";

export const getCurrentUser = async () => {
  return axiosClient.get("/api/user");
};
