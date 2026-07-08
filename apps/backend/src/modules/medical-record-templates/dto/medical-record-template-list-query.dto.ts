import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsUUID } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class MedicalRecordTemplateListQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  // Query params arrive as strings — coerce "true" to boolean. When set, filters for the
  // generalist template (specialty_id IS NULL).
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  generalist?: boolean
}
