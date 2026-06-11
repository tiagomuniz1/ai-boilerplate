import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { ThemeBorderRadius } from '../enums/theme-border-radius.enum'

export class CreateThemeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., azul-clinico)' })
  slug?: string

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'accentColor must be a 6-digit hex color (e.g., #2563EB)' })
  accentColor: string

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'accentSoftColor must be a 6-digit hex color (e.g., #DBEAFE)' })
  accentSoftColor: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsEnum(ThemeBorderRadius)
  borderRadius?: ThemeBorderRadius

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'bgColor must be a 6-digit hex color (e.g., #F4F6FD)' })
  bgColor?: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'bgDarkColor must be a 6-digit hex color (e.g., #0D1526)' })
  bgDarkColor?: string
}
