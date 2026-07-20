import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator'
import { DayOfWeek } from '@app/shared'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ListSchedulesQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activeOn?: string
}
