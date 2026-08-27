import { useQuery } from '@tanstack/react-query'
import { previewRecurrenceUseCase } from '../use-cases/preview-recurrence.use-case'
import type { IRecurrencePreviewInput } from '../types/appointment-input.types'

/**
 * A read, so useQuery rather than useMutation: going back and forth between the
 * form and the preview reuses the cached result, and sitting under
 * ['appointments'] means an existing invalidation drops a stale preview.
 */
export function useRecurrencePreview(params: IRecurrencePreviewInput | null) {
  return useQuery({
    queryKey: ['appointments', 'recurrence-preview', params],
    queryFn: () => previewRecurrenceUseCase(params!),
    enabled: params !== null,
    staleTime: 0,
  })
}
