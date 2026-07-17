import { create } from 'zustand'

export interface IAccessRequestModalState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAccessRequestModalStore = create<IAccessRequestModalState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
