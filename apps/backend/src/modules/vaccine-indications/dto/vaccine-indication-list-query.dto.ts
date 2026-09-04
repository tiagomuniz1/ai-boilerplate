import { IsUUID } from 'class-validator'

export class VaccineIndicationListQueryDto {
  @IsUUID()
  appointmentId: string
}
