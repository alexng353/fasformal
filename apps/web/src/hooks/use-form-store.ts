import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FormStore {
  // Local form draft data (not yet submitted to server)
  draft: Record<string, unknown>;
  setDraft: (step: number, data: Record<string, unknown>) => void;
  getDraft: (step: number) => Record<string, unknown>;
  clearDraft: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      draft: {},
      setDraft: (step, data) =>
        set((state) => ({
          draft: { ...state.draft, [`step_${step}`]: data },
        })),
      getDraft: (step) =>
        (get().draft[`step_${step}`] as Record<string, unknown>) || {},
      clearDraft: () => set({ draft: {} }),
    }),
    { name: "fasformal-form-draft" }
  )
);
