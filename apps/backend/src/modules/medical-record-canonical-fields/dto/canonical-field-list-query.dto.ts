import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsUUID } from 'class-validator'

export class CanonicalFieldListQueryDto {
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean
}
