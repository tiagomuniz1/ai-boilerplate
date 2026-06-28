import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class MedicationListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean
}
