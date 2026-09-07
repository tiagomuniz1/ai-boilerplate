import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateVaccinationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  doseLabel?: string

  @IsOptional()
  @IsDateString()
  appliedAt?: string

  @IsOptional()
  @IsBoolean()
  appliedAtOurClinic?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(160)
  appliedAtDescription?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  manufacturer?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}
