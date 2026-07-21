jest.mock('../use-cases/get-availability.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getAvailabilityUseCase } from '../use-cases/get-availability.use-case'
import { useAvailability } from './use-availability.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeSlot = () => ({
  startTime: '08:00',
  endTime: '08:30',
  scheduleId: 'sched-uuid',
  slotDurationInMinutes: 30,
})

describe('useAvailability', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns slots on success', async () => {
    const slots = [makeSlot()]
    ;(getAvailabilityUseCase as jest.Mock).mockResolvedValue(slots)

    const { result } = renderHook(
      () => useAvailability({ professionalId: 'doc-uuid', date: '2025-06-20', professionalIdKey: 'doc-uuid' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(slots)
  })

  it('does not fetch when params is null', () => {
    renderHook(() => useAvailability(null), { wrapper })
    expect(getAvailabilityUseCase).not.toHaveBeenCalled()
  })

  it('uses professionalIdKey as stable query key for DOCTOR self', async () => {
    ;(getAvailabilityUseCase as jest.Mock).mockResolvedValue([])

    renderHook(
      () => useAvailability({ date: '2025-06-20', professionalIdKey: 'self' }),
      { wrapper },
    )

    await waitFor(() => expect(getAvailabilityUseCase).toHaveBeenCalled())
    expect(getAvailabilityUseCase).toHaveBeenCalledWith({ date: '2025-06-20', professionalIdKey: 'self' })
  })

  it('returns error state on failure', async () => {
    ;(getAvailabilityUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(
      () => useAvailability({ date: '2025-06-20', professionalIdKey: 'self' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
