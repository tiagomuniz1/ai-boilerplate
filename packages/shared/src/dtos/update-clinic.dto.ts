import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

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
}
