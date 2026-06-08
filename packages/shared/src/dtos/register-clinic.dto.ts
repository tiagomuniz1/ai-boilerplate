import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class RegisterClinicDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  clinicName!: string

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., minha-clinica)' })
  slug?: string

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  adminFullName!: string

  @IsEmail()
  adminEmail!: string

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  adminPassword!: string
}
