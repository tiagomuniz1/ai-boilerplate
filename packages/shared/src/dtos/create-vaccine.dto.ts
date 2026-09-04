import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateVaccineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  abbreviation?: string

  @IsOptional()
  @IsString()
  @MaxLength(250)
  preventedDiseases?: string
}
