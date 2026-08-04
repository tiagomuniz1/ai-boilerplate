import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator'
import { Transform } from 'class-transformer'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ListPatientsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  excludeDependents?: boolean

  @IsOptional()
  @IsUUID()
  excludeId?: string
}
