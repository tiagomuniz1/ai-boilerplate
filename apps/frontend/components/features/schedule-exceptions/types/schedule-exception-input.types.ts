export interface ICreateScheduleExceptionInput {
  professionalId?: string
  date: string
  startTime?: string | null
  endTime?: string | null
  reason?: string | null
}

export interface IScheduleExceptionListParams {
  professionalId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}
