import type { ComponentTree, StoredComponent } from "@/lib/editorTypes";
import axios, { AxiosInstance } from "axios";

const client: AxiosInstance = axios.create({
  baseURL: typeof window === "undefined" ? (process.env.NEXT_PUBLIC_BASE_URL ?? "") : undefined,
  headers: { "Content-Type": "application/json" },
});

export type CreateComponentRequest = {
  name?: string;
  source?: string;
  description?: string;
  tree: ComponentTree;
};

export type CreateComponentResponse = { component: StoredComponent };
export type GetComponentResponse = { component: StoredComponent };
export type ListComponentsResponse = { items: StoredComponent[] };
export type UpdateComponentRequest = Partial<
  Pick<StoredComponent, "name" | "source" | "description">
> & {
  tree?: ComponentTree;
};
export type UpdateComponentResponse = { component: StoredComponent };

export const api = {
  createComponent: async (payload: CreateComponentRequest) => {
    const { data } = await client.post<CreateComponentResponse>("/api/component", payload);
    return data;
  },
  getComponent: async (id: string) => {
    const { data } = await client.get<GetComponentResponse>(`/api/component/${id}`);
    return data;
  },
  updateComponent: async (id: string, payload: UpdateComponentRequest) => {
    const { data } = await client.put<UpdateComponentResponse>(`/api/component/${id}`, payload);
    return data;
  },
  listComponents: async () => {
    const { data } = await client.get<ListComponentsResponse>("/api/component");
    return data;
  },
};
