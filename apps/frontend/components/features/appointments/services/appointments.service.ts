import { apiClient } from '@/lib/api-client'
import type {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
  CreateAppointmentDto,
  CancelAppointmentDto,
  AvailabilityResponseDto,
} from '@app/shared'
import type { IAppointmentListParams, IAvailabilityParams } from '../types/appointment-input.types'

export const appointmentsService = {
  getAll: (params?: IAppointmentListParams): Promise<PaginatedAppointmentsResponseDto> => {
    const sp = new URLSearchParams()
    if (params?.doctorId) sp.set('doctorId', params.doctorId)
    if (params?.patientId) sp.set('patientId', params.patientId)
    if (params?.status) sp.set('status', params.status)
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    const q = sp.toString()
    return apiClient.get<PaginatedAppointmentsResponseDto>(`/appointments${q ? `?${q}` : ''}`)
  },
  getById: (id: string): Promise<AppointmentResponseDto> =>
    apiClient.get<AppointmentResponseDto>(`/appointments/${id}`),
  getAvailability: (params: IAvailabilityParams): Promise<AvailabilityResponseDto> => {
    const sp = new URLSearchParams()
    if (params.doctorId) sp.set('doctorId', params.doctorId)
    sp.set('date', params.date)
    return apiClient.get<AvailabilityResponseDto>(`/appointments/availability?${sp.toString()}`)
  },
  book: (data: CreateAppointmentDto): Promise<AppointmentResponseDto> =>
    apiClient.post<AppointmentResponseDto>('/appointments', data),
  cancel: (id: string, data: CancelAppointmentDto): Promise<AppointmentResponseDto> =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/cancel`, data),
  complete: (id: string): Promise<AppointmentResponseDto> =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/complete`, {}),
}
