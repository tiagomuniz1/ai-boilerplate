import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IAuthUserModel } from '@/components/features/auth/types/auth.types'

interface AuthState {
  user: IAuthUserModel | null
  setUser: (user: IAuthUserModel | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-user',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
