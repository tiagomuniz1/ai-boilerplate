import { useMemo } from 'react'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
import type { IProfessionalModel } from '@/components/features/professionals/types/professional-model.types'

// No backend endpoint filters professionals by userId — this looks the professional
// up client-side within a single page. Fine for the clinic scale this system targets
// (PaginationDto caps limit at 100); revisit with a server-side filter if that stops holding.
const MAX_PROFESSIONALS_LOOKUP_LIMIT = 100

export function useProfessionalByUserId(userId: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const {
    data: professionals,
    isPending,
    isError,
  } = useProfessionals({ limit: MAX_PROFESSIONALS_LOOKUP_LIMIT }, { enabled })

  const professional = useMemo<IProfessionalModel | undefined>(
    () => professionals?.find((p) => p.user.id === userId),
    [professionals, userId],
  )

  return {
    professional,
    isPending: enabled && isPending,
    isError: enabled && isError,
  }
}
