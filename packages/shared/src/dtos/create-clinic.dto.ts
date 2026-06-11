import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { AddressDto } from './address.dto'

export class CreateClinicDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., clinica-do-coracao)' })
  slug?: string

  @IsOptional()
  @IsUUID()
  themeId?: string | null

  @ValidateNested()
  address!: AddressDto
}
