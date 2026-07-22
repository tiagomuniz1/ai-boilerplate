import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { CouncilType } from '@app/shared'
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

  // Scopes the generalist bucket to one profession — used together with `generalist`, or on its
  // own (both resolve to the same specialty_id IS NULL AND council_type = X query).
  @IsOptional()
  @IsEnum(CouncilType)
  councilType?: CouncilType
}
