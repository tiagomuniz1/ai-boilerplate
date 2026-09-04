import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { VaccineDecision } from '../enums/vaccine-decision.enum'

export class CreateVaccineDecisionDto {
  @IsUUID()
  patientId!: string

  @IsUUID()
  vaccineId!: string

  @IsEnum(VaccineDecision)
  decision!: VaccineDecision

  /** Por que a decisão foi tomada — fica no histórico junto de quem decidiu. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}
