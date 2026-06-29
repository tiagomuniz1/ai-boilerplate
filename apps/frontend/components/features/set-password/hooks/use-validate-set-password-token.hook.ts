'use client'

import { useQuery } from '@tanstack/react-query'
import { validateSetPasswordTokenUseCase } from '../use-cases/validate-set-password-token.use-case'

export function useValidateSetPasswordToken(token: string | null) {
  return useQuery({
    queryKey: ['set-password-validate', token],
    queryFn: () => validateSetPasswordTokenUseCase(token!),
    enabled: token !== null,
    staleTime: Infinity,
    retry: false,
  })
}
