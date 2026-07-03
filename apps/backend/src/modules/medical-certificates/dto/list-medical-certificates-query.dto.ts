import { IsUUID } from 'class-validator'

export class ListMedicalCertificatesQueryDto {
  @IsUUID()
  appointmentId: string
}
