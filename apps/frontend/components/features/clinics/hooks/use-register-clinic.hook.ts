'use client'

import { useMutation } from '@tanstack/react-query'
import type { RegisterClinicResponseDto } from '@app/shared'
import { registerClinicUseCase } from '../use-cases/register-clinic.use-case'
import type { IRegisterClinicInput } from '../types/clinic.types'
import type { IApiError } from '@/types/api.types'

export function useRegisterClinic() {
  return useMutation<RegisterClinicResponseDto, IApiError, IRegisterClinicInput>({
    mutationFn: ({ adminPasswordConfirm: _, ...rest }) => registerClinicUseCase(rest),
  })
}
