import { QueryRunner } from 'typeorm'
import { PatientGender } from '@app/shared'
import { VaccineScheduleRule } from '../entities/vaccine-schedule-rule.entity'

export interface CreateRuleData {
  vaccineId: string
  doseLabel: string
  doseOrder: number
  minAgeMonths: number
  maxAgeMonths: number | null
  minIntervalDays: number | null
  appliesToGender: PatientGender | null
  isActive: boolean
}

export interface UpdateRuleData {
  doseLabel?: string
  doseOrder?: number
  minAgeMonths?: number
  maxAgeMonths?: number | null
  minIntervalDays?: number | null
  appliesToGender?: PatientGender | null
  isActive?: boolean
}

export abstract class IVaccineScheduleRulesRepository {
  abstract findAll(vaccineId?: string): Promise<VaccineScheduleRule[]>
  abstract findAllActive(): Promise<VaccineScheduleRule[]>
  abstract findById(id: string): Promise<VaccineScheduleRule | null>
  abstract findByVaccineAndOrder(vaccineId: string, doseOrder: number): Promise<VaccineScheduleRule | null>
  abstract create(data: CreateRuleData, queryRunner?: QueryRunner): Promise<VaccineScheduleRule>
  abstract update(id: string, data: UpdateRuleData, queryRunner?: QueryRunner): Promise<VaccineScheduleRule>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
