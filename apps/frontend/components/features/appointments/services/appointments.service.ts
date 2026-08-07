import { apiClient } from '@/lib/api-client'
import type {
  AppointmentResponseDto,
  AppointmentDetailResponseDto,
  PaginatedAppointmentsResponseDto,
  CreateAppointmentDto,
  CancelAppointmentDto,
  AvailabilityResponseDto,
  ReassignCandidateDto,
} from '@app/shared'
import type { IAppointmentListParams, IAvailabilityParams } from '../types/appointment-input.types'

export const appointmentsService = {
  getAll: (params?: IAppointmentListParams): Promise<PaginatedAppointmentsResponseDto> => {
    const sp = new URLSearchParams()
    if (params?.professionalId) sp.set('professionalId', params.professionalId)
    if (params?.patientId) sp.set('patientId', params.patientId)
    if (params?.status) sp.set('status', params.status)
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    const q = sp.toString()
    return apiClient.get<PaginatedAppointmentsResponseDto>(`/appointments${q ? `?${q}` : ''}`)
  },
  getById: (id: string): Promise<AppointmentDetailResponseDto> =>
    apiClient.get<AppointmentDetailResponseDto>(`/appointments/${id}`),
  getAvailability: (params: IAvailabilityParams): Promise<AvailabilityResponseDto> => {
    const sp = new URLSearchParams()
    if (params.professionalId) sp.set('professionalId', params.professionalId)
    sp.set('date', params.date)
    return apiClient.get<AvailabilityResponseDto>(`/appointments/availability?${sp.toString()}`)
  },
  book: (data: CreateAppointmentDto): Promise<AppointmentResponseDto> =>
    apiClient.post<AppointmentResponseDto>('/appointments', data),
  cancel: (id: string, data: CancelAppointmentDto): Promise<AppointmentResponseDto> =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/cancel`, data),
  complete: (id: string): Promise<AppointmentResponseDto> =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/complete`, {}),
  getReassignCandidates: (id: string): Promise<ReassignCandidateDto[]> =>
    apiClient.get<ReassignCandidateDto[]>(`/appointments/${id}/reassign-candidates`),
  reassign: (id: string, professionalId: string): Promise<AppointmentResponseDto> =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/reassign`, { professionalId }),
}
