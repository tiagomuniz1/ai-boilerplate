import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateMedicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(250)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  activeIngredient?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  regulatoryCategory?: string

  @IsOptional()
  @IsString()
  @MaxLength(250)
  therapeuticClass?: string

  @IsOptional()
  @IsString()
  @MaxLength(250)
  holderCompany?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registrationNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registrationStatus?: string
}
