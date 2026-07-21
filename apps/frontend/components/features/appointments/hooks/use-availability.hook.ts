import { useQuery } from '@tanstack/react-query'
import { getAvailabilityUseCase } from '../use-cases/get-availability.use-case'
import type { IAvailabilityParams } from '../types/appointment-input.types'

export function useAvailability(params: (IAvailabilityParams & { professionalIdKey: string }) | null) {
  return useQuery({
    queryKey: ['availability', params?.professionalIdKey ?? 'self', params?.date ?? ''],
    queryFn: () => getAvailabilityUseCase(params!),
    enabled: params !== null,
  })
}
