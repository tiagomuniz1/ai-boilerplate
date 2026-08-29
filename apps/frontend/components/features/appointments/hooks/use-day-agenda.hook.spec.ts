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
  professionalId: 'doc-uuid',
  professionalName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime,
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
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

  it('returns empty slots and disabled when professionalId is null', () => {
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

  it('uses "self" as professionalId key when professionalId is "self"', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    renderHook(() => useDayAgenda('self', '2025-06-20'))

    const availCall = (useAvailability as jest.Mock).mock.calls[0][0]
    expect(availCall.professionalIdKey).toBe('self')
    expect(availCall.professionalId).toBeUndefined()
  })

  it('passes professionalId for ADMIN/USER selection', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    renderHook(() => useDayAgenda('doc-uuid-123', '2025-06-20'))

    const availCall = (useAvailability as jest.Mock).mock.calls[0][0]
    expect(availCall.professionalId).toBe('doc-uuid-123')
    expect(availCall.professionalIdKey).toBe('doc-uuid-123')
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

  it('does not filter by status so all appointment statuses appear', () => {
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [] }))

    renderHook(() => useDayAgenda('doc-uuid', '2025-06-20'))

    const apptCall = (useAppointments as jest.Mock).mock.calls[0][0]
    expect(apptCall).not.toHaveProperty('status')
  })

  it('shows completed appointment as booked slot', () => {
    const completed = { ...makeAppointment('09:00'), status: AppointmentStatus.COMPLETED }
    ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult([]))
    ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: [completed] }))

    const { result } = renderHook(() => useDayAgenda('doc-uuid', '2025-06-20'))

    expect(result.current.slots).toHaveLength(1)
    expect(result.current.slots[0].status).toBe('booked')
    expect(result.current.slots[0].appointment?.status).toBe(AppointmentStatus.COMPLETED)
  })
  // Availability only withholds a slot while the appointment is SCHEDULED, so every
  // other status came back as a free slot AND as an appointment, and the agenda
  // rendered the same time twice — which reads as a double booking.
  describe('one row per start time', () => {
    const setup = (slots: IAvailableSlotModel[], appointments: IAppointmentModel[]) => {
      ;(useAvailability as jest.Mock).mockReturnValue(makeQueryResult(slots))
      ;(useAppointments as jest.Mock).mockReturnValue(makeQueryResult({ data: appointments }))
      return renderHook(() => useDayAgenda('doc-uuid', '2025-06-20')).result.current.slots
    }

    it('shows the free slot, not the cancelled appointment, when both land on 15:00', () => {
      const cancelled = { ...makeAppointment('15:00'), status: AppointmentStatus.CANCELLED }
      const slots = setup([makeSlot('15:00')], [cancelled])

      expect(slots).toHaveLength(1)
      expect(slots[0].status).toBe('free')
      expect(slots[0].appointment).toBeNull()
    })

    it('keeps a cancelled appointment when no free slot covers its time', () => {
      const cancelled = { ...makeAppointment('15:00'), status: AppointmentStatus.CANCELLED }
      const slots = setup([], [cancelled])

      expect(slots).toHaveLength(1)
      expect(slots[0].appointment?.status).toBe(AppointmentStatus.CANCELLED)
    })

    it.each([
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ])('shows the %s appointment instead of the free slot at the same time', (status) => {
      const appointment = { ...makeAppointment('15:00'), status }
      const slots = setup([makeSlot('15:00')], [appointment])

      expect(slots).toHaveLength(1)
      expect(slots[0].status).toBe('booked')
      expect(slots[0].appointment?.status).toBe(status)
    })

    it('prefers the active appointment over a cancelled one in the same slot', () => {
      const cancelled = { ...makeAppointment('15:00'), id: 'old', status: AppointmentStatus.CANCELLED }
      const scheduled = { ...makeAppointment('15:00'), id: 'new', status: AppointmentStatus.SCHEDULED }
      const slots = setup([], [cancelled, scheduled])

      expect(slots).toHaveLength(1)
      expect(slots[0].appointment?.id).toBe('new')
    })

    it('leaves distinct times untouched and ordered', () => {
      const slots = setup(
        [makeSlot('16:00'), makeSlot('08:00')],
        [makeAppointment('09:00')],
      )

      expect(slots.map((s) => s.startTime)).toEqual(['08:00', '09:00', '16:00'])
    })
  })
})
