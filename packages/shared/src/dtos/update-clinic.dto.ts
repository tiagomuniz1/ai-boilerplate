import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { AddressDto } from './address.dto'

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., clinica-do-coracao)' })
  slug?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsUUID()
  themeId?: string | null

  @IsOptional()
  @ValidateNested()
  address?: AddressDto
}
