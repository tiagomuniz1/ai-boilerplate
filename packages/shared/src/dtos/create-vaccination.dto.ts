import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CreateVaccinationDto {
  @IsUUID()
  patientId!: string

  @IsUUID()
  vaccineId!: string

  /**
   * Opcional de propósito: uma dose tomada anos atrás num posto de saúde não
   * tem consulta a que se amarrar. Quando informado, dá rastreabilidade.
   */
  @IsOptional()
  @IsUUID()
  appointmentId?: string

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  doseLabel!: string

  @IsDateString()
  appliedAt!: string

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
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
