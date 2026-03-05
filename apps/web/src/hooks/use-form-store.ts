import { create } from "zustand";
import { persist } from "zustand/middleware";

type StepDraft = Record<string, unknown>;

interface FormStore {
  drafts: Record<string, StepDraft>;
  setDraft: (step: number, data: StepDraft) => void;
  getDraft: (step: number) => StepDraft;
  clearStep: (step: number) => void;
  clearAll: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      setDraft: (step, data) =>
        set((state) => ({
          drafts: { ...state.drafts, [step]: data },
        })),
      getDraft: (step) =>
        (get().drafts[step] as StepDraft) ?? {},
      clearStep: (step) =>
        set((state) => {
          const { [step]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
      clearAll: () => set({ drafts: {} }),
    }),
    { name: "fasformal-form-draft" },
  ),
);
