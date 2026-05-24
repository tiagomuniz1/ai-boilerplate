jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../use-cases/create-schedule.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { DayOfWeek } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { createScheduleUseCase } from '../use-cases/create-schedule.use-case'
import { useCreateSchedule } from './use-create-schedule.hook'
import type { ICreateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const input: ICreateScheduleInput = {
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
}

const mockModel: IScheduleModel = {
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
}

describe('useCreateSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createScheduleUseCase with given input', async () => {
    ;(createScheduleUseCase as jest.Mock).mockResolvedValue(mockModel)

    const { result } = renderHook(() => useCreateSchedule(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(createScheduleUseCase).toHaveBeenCalled()
    const [firstArg] = (createScheduleUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(input)
  })

  it('invalidates schedules queries and redirects on success', async () => {
    ;(createScheduleUseCase as jest.Mock).mockResolvedValue(mockModel)

    const { result } = renderHook(() => useCreateSchedule(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/schedules')
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Schedule overlap' }
    ;(createScheduleUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateSchedule(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
