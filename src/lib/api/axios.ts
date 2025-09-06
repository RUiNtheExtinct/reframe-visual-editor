import axios, { AxiosInstance } from "axios";

export const axiosClient: AxiosInstance = axios.create({
  baseURL: typeof window === "undefined" ? (process.env.NEXT_PUBLIC_BASE_URL ?? "") : undefined,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;
    const message =
      (data && (data.message || data.error)) ||
      error?.message ||
      (status ? `Request failed (${status})` : "Request failed");
    return Promise.reject(new Error(message));
  }
);
