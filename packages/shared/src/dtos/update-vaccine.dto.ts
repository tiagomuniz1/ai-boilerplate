import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateVaccineDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  abbreviation?: string

  @IsOptional()
  @IsString()
  @MaxLength(250)
  preventedDiseases?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
