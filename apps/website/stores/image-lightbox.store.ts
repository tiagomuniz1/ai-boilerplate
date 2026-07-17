import { create } from 'zustand'

export interface IImageLightboxState {
  src: string | null
  alt: string
  open: (src: string, alt: string) => void
  close: () => void
}

export const useImageLightboxStore = create<IImageLightboxState>()((set) => ({
  src: null,
  alt: '',
  open: (src, alt) => set({ src, alt }),
  close: () => set({ src: null, alt: '' }),
}))
