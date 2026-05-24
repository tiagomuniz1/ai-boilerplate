import type { DayOfWeek } from '@app/shared'

export interface ICreateScheduleInput {
  doctorId?: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  validFrom?: string
  validUntil?: string
}

export interface IUpdateScheduleInput {
  dayOfWeek?: DayOfWeek
  startTime?: string
  endTime?: string
  slotDurationInMinutes?: number
  validFrom?: string | null
  validUntil?: string | null
}

export interface IScheduleListParams {
  doctorId?: string
  dayOfWeek?: DayOfWeek
  activeOn?: string
  page?: number
  limit?: number
}
