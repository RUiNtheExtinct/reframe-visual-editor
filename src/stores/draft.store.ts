"use client";

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type UnsavedDraft = {
  source?: string;
  name?: string;
  description?: string;
  updatedAt: number;
};

type DraftState = {
  drafts: Record<string, UnsavedDraft>;
  postAuthId: string | null;
};

type DraftActions = {
  setDraft: (id: string, draft: Omit<UnsavedDraft, "updatedAt">) => void;
  clearDraft: (id: string) => void;
  clearAllDrafts: () => void;
  setPostAuthId: (id: string | null) => void;
  consumePostAuthId: () => string | null;
};

type DraftStore = DraftState & DraftActions;

const initialState: DraftState = {
  drafts: {},
  postAuthId: null,
};

export const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setDraft: (id, draft) => {
          set((s) => {
            s.drafts[id] = { ...draft, updatedAt: Date.now() } as UnsavedDraft;
          });
        },

        clearDraft: (id) => {
          set((s) => {
            if (s.drafts[id]) delete s.drafts[id];
          });
        },

        clearAllDrafts: () => {
          set((s) => {
            s.drafts = {};
          });
        },

        setPostAuthId: (id) => {
          set((s) => {
            s.postAuthId = id;
          });
        },

        consumePostAuthId: () => {
          const id = get().postAuthId;
          set((s) => {
            s.postAuthId = null;
          });
          return id;
        },
      })),
      {
        name: "reframe-draft-store",
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ drafts: state.drafts, postAuthId: state.postAuthId }),
      }
    )
  )
);

// Selectors
export const useDraftById = (id: string) =>
  useDraftStore((s) => (id ? s.drafts[id] || null : null));
export const usePostAuthDraftId = () => useDraftStore((s) => s.postAuthId);
