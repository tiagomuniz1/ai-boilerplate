import { IsDateString, IsOptional, IsUUID } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ListScheduleExceptionsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string
}
