import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'accentColor must be a 6-digit hex color (e.g., #2563EB)' })
  accentColor?: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'accentSoftColor must be a 6-digit hex color (e.g., #DBEAFE)' })
  accentSoftColor?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
