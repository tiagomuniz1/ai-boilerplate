import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator'
import { AppointmentStatus } from '@app/shared'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ListAppointmentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsUUID()
  patientId?: string

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  to?: string
}
