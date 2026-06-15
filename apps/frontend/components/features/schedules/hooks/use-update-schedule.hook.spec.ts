jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../use-cases/update-schedule.use-case')
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { DayOfWeek } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { updateScheduleUseCase } from '../use-cases/update-schedule.use-case'
import { useUpdateSchedule } from './use-update-schedule.hook'
import type { IScheduleModel } from '../types/schedule-model.types'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const mockModel: IScheduleModel = {
  id: 'uuid-1',
  doctorId: 'doc-uuid',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '09:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useUpdateSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateScheduleUseCase with id and data', async () => {
    ;(updateScheduleUseCase as jest.Mock).mockResolvedValue(mockModel)

    const { result } = renderHook(() => useUpdateSchedule(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { startTime: '09:00' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateScheduleUseCase).toHaveBeenCalledWith('uuid-1', { startTime: '09:00' })
  })

  it('redirects to schedule details on success', async () => {
    ;(updateScheduleUseCase as jest.Mock).mockResolvedValue(mockModel)

    const { result } = renderHook(() => useUpdateSchedule(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { startTime: '09:00' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/test-clinic/schedules/uuid-1')
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Schedule overlap' }
    ;(updateScheduleUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateSchedule(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { startTime: '09:00' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
