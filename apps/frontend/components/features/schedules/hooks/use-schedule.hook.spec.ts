jest.mock('../use-cases/get-schedule.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { DayOfWeek } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { getScheduleUseCase } from '../use-cases/get-schedule.use-case'
import { useSchedule } from './use-schedule.hook'
import type { IScheduleModel } from '../types/schedule-model.types'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = (): IScheduleModel => ({
  id: 'uuid-1',
  doctorId: 'doc-uuid',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useSchedule', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns schedule data on success', async () => {
    const model = makeModel()
    ;(getScheduleUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useSchedule('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(model)
  })

  it('calls getScheduleUseCase with the given id', async () => {
    ;(getScheduleUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useSchedule('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getScheduleUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getScheduleUseCase as jest.Mock).mockRejectedValue({ status: 404 })

    const { result } = renderHook(() => useSchedule('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useSchedule(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getScheduleUseCase).not.toHaveBeenCalled()
  })
})
