'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { updateUserUseCase } from '../use-cases/update-user.use-case'
import type { IUpdateUserInput } from '../types/user-input.types'
import type { IUserModel } from '../types/user-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IUserModel, IApiError, { id: string; input: IUpdateUserInput }>({
    mutationFn: ({ id, input }) => updateUserUseCase(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      router.push('/users')
    },
  })
}
