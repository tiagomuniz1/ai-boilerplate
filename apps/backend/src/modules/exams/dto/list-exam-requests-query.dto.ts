import { IsUUID } from 'class-validator'

export class ListExamRequestsQueryDto {
  @IsUUID()
  appointmentId: string
}
