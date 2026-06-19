jest.mock('./use-appointments.hook')
jest.mock('./use-availability.hook')

import { AppointmentStatus } from '@app/shared'
import { renderHook } from '@testing-library/react'
import { useAppointments } from './use-appointments.hook'
import { useAvailability } from './use-availability.hook'
import { useDayAgenda } from './use-day-agenda.hook'
import type { IAppointmentModel, IAvailableSlotModel } from '../types/appointment-model.types'

const makeSlot = (startTime = '08:00'): IAvailableSlotModel => ({
  startTime,
  endTime: '08:30',
  scheduleId: 'sched-uuid',
  slotDurationInMinutes: 30,
})

const makeAppointment = (startTime = '09:00'): IAppointmentModel => ({
  id: 'apt-uuid',
  doctorId: 'doc-uuid',
  doctorName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient',
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime,
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeQueryResult = (data: unknown, extra = {}) => ({
  data,
  isLoading: false,
  isError: false,
  ...extra,
})

describe('useDayAgenda', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty slots and disabled when doctorId is null', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    const { result } = renderHook(() => useDayAgenda(null, '2025-06-20'))

    expect(result.current.slots).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(useAvailability).toHaveBeenCalledWith(null)
  })

  it('merges free and booked slots sorted by startTime', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([makeSlot('08:00'), makeSlot('09:30')]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [makeAppointment('09:00')] }))

    const { result } = renderHook(() => useDayAgenda('doc-uuid', '2025-06-20'))

    const { slots } = result.current
    expect(slots).toHaveLength(3)
    expect(slots[0].startTime).toBe('08:00')
    expect(slots[0].status).toBe('free')
    expect(slots[1].startTime).toBe('09:00')
    expect(slots[1].status).toBe('booked')
    expect(slots[1].appointment).toBeDefined()
    expect(slots[2].startTime).toBe('09:30')
    expect(slots[2].status).toBe('free')
  })

  it('uses "self" as doctorId key when doctorId is "self"', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    renderHook(() => useDayAgenda('self', '2025-06-20'))

    const availCall = (useAvailability as jest.Mock).mock.calls[0][0]
    expect(availCall.doctorIdKey).toBe('self')
    expect(availCall.doctorId).toBeUndefined()
  })

  it('passes doctorId for ADMIN/USER selection', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    renderHook(() => useDayAgenda('doc-uuid-123', '2025-06-20'))

    const availCall = (useAvailability as jest.Mock).mock.calls[0][0]
    expect(availCall.doctorId).toBe('doc-uuid-123')
    expect(availCall.doctorIdKey).toBe('doc-uuid-123')
  })

  it('propagates isLoading state', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult(undefined, { isLoading: true }))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult(undefined, { isLoading: false }))

    const { result } = renderHook(() => useDayAgenda('doc-uuid', '2025-06-20'))

    expect(result.current.isLoading).toBe(true)
  })

  it('propagates isError state', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult(undefined, { isError: true, isLoading: false }))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    const { result } = renderHook(() => useDayAgenda('doc-uuid', '2025-06-20'))

    expect(result.current.isError).toBe(true)
  })
})
