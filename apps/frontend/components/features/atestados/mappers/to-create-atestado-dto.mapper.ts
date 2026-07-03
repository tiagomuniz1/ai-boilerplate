import { MedicalCertificateType } from '@app/shared'
import type { CreateMedicalCertificateDto } from '@app/shared'
import type { ICreateAtestadoInput } from '../types/atestado-input.types'

export function toCreateAtestadoDto(input: ICreateAtestadoInput): CreateMedicalCertificateDto {
  const isLeave = input.type === MedicalCertificateType.LEAVE

  return {
    appointmentId: input.appointmentId,
    type: input.type,
    ...(isLeave
      ? {
          daysOff: input.daysOff!,
          startDate: input.startDate!,
          ...(input.cidCode ? { cidCode: input.cidCode } : {}),
        }
      : {
          attendanceDate: input.attendanceDate!,
          checkInTime: input.checkInTime!,
          checkOutTime: input.checkOutTime!,
        }),
    ...(input.observations ? { observations: input.observations } : {}),
  } as CreateMedicalCertificateDto
}
