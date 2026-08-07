import { IsUUID } from 'class-validator'

export class ReassignAppointmentDto {
  @IsUUID()
  professionalId: string
}
