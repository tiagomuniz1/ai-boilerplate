import { IsOptional, IsUUID } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class VaccinationListQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  patientId?: string

  @IsOptional()
  @IsUUID()
  appointmentId?: string
}
