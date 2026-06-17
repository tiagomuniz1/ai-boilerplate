import { IsOptional, IsString } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ClinicSpecialtiesListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string
}
