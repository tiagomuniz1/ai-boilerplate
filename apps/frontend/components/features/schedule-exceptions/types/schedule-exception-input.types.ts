export interface ICreateScheduleExceptionInput {
  doctorId?: string
  date: string
  startTime?: string | null
  endTime?: string | null
  reason?: string | null
}

export interface IScheduleExceptionListParams {
  doctorId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}
