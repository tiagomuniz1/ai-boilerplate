import type { MedicalCertificateResponseDto } from '@app/shared'
import type { IAtestadoModel } from '../types/atestado-model.types'

export function toAtestadoModel(dto: MedicalCertificateResponseDto): IAtestadoModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    professionalId: dto.professionalId,
    professionalName: dto.professionalName,
    type: dto.type,
    daysOff: dto.daysOff,
    startDate: dto.startDate ? new Date(dto.startDate as unknown as string) : null,
    cidCode: dto.cidCode,
    attendanceDate: dto.attendanceDate ? new Date(dto.attendanceDate as unknown as string) : null,
    checkInTime: dto.checkInTime,
    checkOutTime: dto.checkOutTime,
    observations: dto.observations,
    issuedAt: new Date(dto.issuedAt as unknown as string),
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}
