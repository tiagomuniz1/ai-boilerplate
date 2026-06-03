import type { DayOfWeek } from '@app/shared'

export interface IScheduleModel {
  id: string
  doctorId: string
  doctorName: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  validFrom: string | null
  validUntil: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedSchedulesModel {
  data: IScheduleModel[]
  total: number
  page: number
  limit: number
}

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}
