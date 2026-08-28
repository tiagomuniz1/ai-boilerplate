jest.mock('../use-cases/preview-recurrence.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { DayOfWeek, RecurrenceInterval, RecurringOccurrenceAvailability } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { previewRecurrenceUseCase } from '../use-cases/preview-recurrence.use-case'
import { useRecurrencePreview } from './use-recurrence-preview.hook'
import type { IRecurrencePreviewModel } from '../types/appointment-model.types'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeParams = () => ({
  patientId: 'pat-uuid',
  date: '2099-06-16',
  startTime: '09:00',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  occurrenceCount: 3,
})

const makeModel = (): IRecurrencePreviewModel => ({
  professionalId: 'doc-uuid',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  occurrences: [
    {
      date: '2099-06-16',
      startTime: '09:00',
      endTime: '09:30',
      availability: RecurringOccurrenceAvailability.AVAILABLE,
      selectable: true,
    },
  ],
  availableOccurrenceCount: 1,
  unavailableOccurrenceCount: 0,
  truncatedByMaximumOccurrences: false,
  truncatedByHorizon: false,
})

describe('useRecurrencePreview', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not fetch while the params are null', () => {
    const { result } = renderHook(() => useRecurrencePreview(null), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(previewRecurrenceUseCase).not.toHaveBeenCalled()
  })

  it('fetches the preview once params are supplied', async () => {
    const model = makeModel()
    ;(previewRecurrenceUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useRecurrencePreview(makeParams()), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(previewRecurrenceUseCase).toHaveBeenCalledWith(makeParams())
    expect(result.current.data).toBe(model)
  })

  it('exposes the error state on failure', async () => {
    const error = { status: 500, title: 'Internal Server Error' }
    ;(previewRecurrenceUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useRecurrencePreview(makeParams()), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
