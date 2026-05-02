'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/components/features/auth/services/auth.service'

export interface IUseLogoutResult {
  logout: () => Promise<void>
  isPending: boolean
  error: string | null
}

export function useLogout(): IUseLogoutResult {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setUser(null)
      queryClient.clear()
      router.push('/login')
    },
    onError: () => {
      setError('Ocorreu um erro ao sair. Tente novamente.')
    },
  })

  const logout = async (): Promise<void> => {
    setError(null)
    await mutation.mutateAsync()
  }

  return {
    logout,
    isPending: mutation.isPending,
    error,
  }
}
