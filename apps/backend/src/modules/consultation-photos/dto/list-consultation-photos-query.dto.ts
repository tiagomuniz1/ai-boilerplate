import { IsUUID } from 'class-validator'

export class ListConsultationPhotosQueryDto {
  @IsUUID()
  appointmentId: string
}
