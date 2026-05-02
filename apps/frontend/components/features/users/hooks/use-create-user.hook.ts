'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createUserUseCase } from '../use-cases/create-user.use-case'
import type { ICreateUserInput } from '../types/user-input.types'
import type { IUserModel } from '../types/user-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation<IUserModel, IApiError, ICreateUserInput>({
    mutationFn: createUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push('/users')
    },
  })
}
