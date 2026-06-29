import { IsUUID } from 'class-validator'

export class PrescriptionListQueryDto {
  @IsUUID()
  appointmentId: string
}
