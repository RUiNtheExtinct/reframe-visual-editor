"use client";

import { useUserStore } from "@/stores";
import { ZustandDevtools } from "@bytes2pro/zustand-dev-tools/next";
// import "@bytes2pro/zustand-dev-tools/next/style";
import { memo } from "react";

export const ZustandDevtoolsProviderComponent = () => {
  const stores = [{ name: "UserStore", store: useUserStore, state: useUserStore() }];
  if (process.env.NODE_ENV !== "development") return null;
  return <ZustandDevtools stores={stores} className="bottom-4 right-4" />;
};

export const ZustandDevtoolsProvider = memo(ZustandDevtoolsProviderComponent);
