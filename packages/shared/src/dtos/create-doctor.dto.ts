import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateDoctorDto {
  @IsUUID()
  userId!: string

  @IsString()
  @Matches(/^\d{1,6}\/[A-Z]{2}$/, { message: 'crmNumber must be in the format NNNNN/UF (e.g., 12345/SP)' })
  crmNumber!: string

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  specialty!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string
}
