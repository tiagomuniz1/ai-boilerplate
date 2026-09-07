import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'

export class CreateVaccineScheduleRuleDto {
  @IsUUID()
  vaccineId!: string

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  doseLabel!: string

  @IsInt()
  @Min(1)
  @Type(() => Number)
  doseOrder!: number

  /** Idade mínima em meses. 0 = ao nascer. */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minAgeMonths!: number

  /** Idade máxima em meses; ausente = sem teto. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxAgeMonths?: number

  /** Intervalo mínimo desde a dose anterior. Ausente na primeira dose. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minIntervalDays?: number

  /** Ausente = vale para todos. */
  @IsOptional()
  @IsEnum(PatientGender)
  appliesToGender?: PatientGender
}
