import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'

export class UpdateVaccineScheduleRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  doseLabel?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  doseOrder?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minAgeMonths?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxAgeMonths?: number | null

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minIntervalDays?: number | null

  @IsOptional()
  @IsEnum(PatientGender)
  appliesToGender?: PatientGender | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
