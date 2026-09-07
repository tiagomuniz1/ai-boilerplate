import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  PatientVaccineStatusItemDto,
  PatientVaccineStatusResponseDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IVaccinationsRepository } from '../../vaccinations/repositories/vaccinations.repository.interface'
import { IVaccineDecisionsRepository } from '../repositories/vaccine-decisions.repository.interface'
import { IVaccineScheduleRulesRepository } from '../repositories/vaccine-schedule-rules.repository.interface'
import { evaluateVaccineSchedule, idadeEmMeses } from '../utils/evaluate-vaccine-schedule'

/**
 * O que falta para este paciente, segundo o calendário.
 *
 * Orquestra: carrega regras ativas, doses e decisões, e delega o cálculo à
 * função pura. Nenhuma regra clínica mora aqui — é tudo em
 * `evaluate-vaccine-schedule`, que é testável sem banco.
 */
@Injectable()
export class GetPatientVaccineStatusUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetPatientVaccineStatusUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly rulesRepository: IVaccineScheduleRulesRepository,
    private readonly vaccinationsRepository: IVaccinationsRepository,
    private readonly decisionsRepository: IVaccineDecisionsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(patientId: string, currentUser: ICurrentUser): Promise<PatientVaccineStatusResponseDto> {
    const clinicId = currentUser.clinicId!

    // Situação vacinal é dado clínico, como a própria caderneta.
    if (currentUser.role === UserRole.USER) {
      throw new ForbiddenException('Insufficient permissions')
    }

    const patient = await this.patientsRepository.findById(patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const hoje = new Date().toISOString().slice(0, 10)
    // O cache carrega o dia na chave: a situação muda sozinha à meia-noite,
    // porque a idade do paciente avança sem nada acontecer no sistema.
    const cacheKey = `vaccine_status:${clinicId}:${patientId}:${hoje}`

    try {
      const cached = await this.cacheService.get<PatientVaccineStatusResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetPatientVaccineStatusUseCase.name })
    }

    const [rules, [vaccinations], decisions] = await Promise.all([
      this.rulesRepository.findAllActive(),
      this.vaccinationsRepository.findByPatient(patientId, clinicId, 1, 500),
      this.decisionsRepository.findByPatient(patientId, clinicId),
    ])

    const calculado = evaluateVaccineSchedule({
      birthDate: patient.birthDate,
      gender: patient.gender,
      hoje,
      regras: rules.map((rule) => ({
        vaccineId: rule.vaccineId,
        doseLabel: rule.doseLabel,
        doseOrder: rule.doseOrder,
        minAgeMonths: rule.minAgeMonths,
        maxAgeMonths: rule.maxAgeMonths,
        minIntervalDays: rule.minIntervalDays,
        appliesToGender: rule.appliesToGender,
      })),
      doses: vaccinations.map((v) => ({ vaccineId: v.vaccineId, appliedAt: v.appliedAt })),
      decisions: decisions.map((d) => ({ vaccineId: d.vaccineId, decision: d.decision })),
    })

    const nomePorVacina = new Map(rules.map((r) => [r.vaccineId, r.vaccine]))
    const decisaoPorVacina = new Map(decisions.map((d) => [d.vaccineId, d]))

    const items: PatientVaccineStatusItemDto[] = calculado.map((item) => {
      const vaccine = nomePorVacina.get(item.vaccineId)
      const decisao = decisaoPorVacina.get(item.vaccineId)
      return {
        vaccineId: item.vaccineId,
        vaccineName: vaccine?.name ?? '',
        vaccineAbbreviation: vaccine?.abbreviation ?? null,
        status: item.status,
        nextDoseLabel: item.nextDoseLabel,
        nextDoseDueFrom: item.nextDoseDueFrom,
        dosesTaken: item.dosesTaken,
        dosesExpected: item.dosesExpected,
        decision: decisao?.decision ?? null,
        decisionReason: decisao?.reason ?? null,
        decidedByProfessionalName: decisao?.decidedByProfessional?.user?.fullName ?? null,
      }
    })

    items.sort((a, b) => a.vaccineName.localeCompare(b.vaccineName, 'pt-BR'))

    const result: PatientVaccineStatusResponseDto = {
      patientId,
      ageInMonths: idadeEmMeses(patient.birthDate, hoje),
      items,
    }

    try {
      await this.cacheService.set(cacheKey, result, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: GetPatientVaccineStatusUseCase.name })
    }

    return result
  }
}
