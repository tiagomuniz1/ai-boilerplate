import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator'

export class CreateDoctorDto {
  @IsOptional()
  @IsUUID()
  userId?: string

  @ValidateIf(o => !o.userId)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName?: string

  @ValidateIf(o => !o.userId)
  @IsEmail()
  email?: string

  @IsString()
  @Matches(/^\d{1,6}\/[A-Z]{2}$/, { message: 'crmNumber must be in the format NNNNN/UF (e.g., 12345/SP)' })
  crmNumber!: string

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  specialtyIds!: string[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string
}
