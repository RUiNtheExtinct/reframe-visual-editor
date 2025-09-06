import { axiosClient } from "@/lib/api/axios";
import type { ComponentTree, StoredComponent } from "@/types/editor";

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
    const { data } = await axiosClient.post<CreateComponentResponse>("/api/component", payload);
    return data;
  },
  getComponent: async (id: string) => {
    const { data } = await axiosClient.get<GetComponentResponse>(`/api/component/${id}`);
    return data;
  },
  updateComponent: async (id: string, payload: UpdateComponentRequest) => {
    const { data } = await axiosClient.put<UpdateComponentResponse>(
      `/api/component/${id}`,
      payload
    );
    return data;
  },
  listComponents: async () => {
    const { data } = await axiosClient.get<ListComponentsResponse>("/api/component");
    return data;
  },
};
