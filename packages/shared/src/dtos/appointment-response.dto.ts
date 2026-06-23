import { AppointmentInsuranceType } from '../enums/appointment-insurance-type.enum'
import { AppointmentStatus } from '../enums/appointment-status.enum'

export class AppointmentResponseDto {
  id: string
  doctorId: string
  doctorName: string
  patientId: string
  patientName: string
  specialtyId: string | null
  specialtyName: string | null
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  insuranceType: AppointmentInsuranceType | null
  reason: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
}
