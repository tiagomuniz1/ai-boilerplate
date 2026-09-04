import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateVaccineDecisionDto, VaccineDecision } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccinesRepository } from '../../vaccines/repositories/vaccines.repository.interface'
import { IVaccineDecisionsRepository } from '../repositories/vaccine-decisions.repository.interface'

/**
 * A palavra final do profissional sobre uma pendência.
 *
 * É o que mantém o sistema no papel de informante: ele aponta "pendente pelo
 * calendário", e quem decide é quem atende — com o motivo registrado.
 */
@Injectable()
export class RecordVaccineDecisionUseCase extends BaseUseCase {
  private readonly logger = new Logger(RecordVaccineDecisionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly decisionsRepository: IVaccineDecisionsRepository,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateVaccineDecisionDto, currentUser: ICurrentUser) {
    const clinicId = currentUser.clinicId!

    // Decidir sobre esquema vacinal é ato clínico: exige ficha, como registrar
    // uma dose. Cargo administrativo sozinho não decide.
    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional) throw new ForbiddenException('Insufficient permissions')

    const patient = await this.patientsRepository.findById(dto.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const vaccine = await this.vaccinesRepository.findById(dto.vaccineId)
    if (!vaccine) throw new UnprocessableEntityException(`Vaccine not found: ${dto.vaccineId}`)

    // Dispensar e adiar mudam o que a paciente vê na tela; sem o motivo, ninguém
    // depois sabe por que a pendência sumiu.
    if (dto.decision !== VaccineDecision.CONFIRMADA && !dto.reason?.trim()) {
      throw new UnprocessableEntityException('A reason is required to postpone or waive a dose')
    }

    // Uma decisão vigente por (paciente, vacina): a nova substitui a anterior,
    // que fica no soft delete como histórico de quem decidiu o quê.
    const existing = await this.decisionsRepository.findByPatientAndVaccine(
      dto.patientId,
      dto.vaccineId,
      clinicId,
    )
    if (existing) await this.decisionsRepository.delete(existing.id)

    const decision = await this.decisionsRepository.create({
      clinicId,
      patientId: dto.patientId,
      vaccineId: dto.vaccineId,
      decision: dto.decision,
      reason: dto.reason?.trim() || null,
      decidedByProfessionalId: professional.id,
    })

    try {
      await this.cacheService.delByPattern(`vaccine_status:${clinicId}:${dto.patientId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: RecordVaccineDecisionUseCase.name })
    }

    return {
      id: decision.id,
      patientId: decision.patientId,
      vaccineId: decision.vaccineId,
      decision: decision.decision,
      reason: decision.reason,
      decidedByProfessionalName: decision.decidedByProfessional.user.fullName,
      createdAt: decision.createdAt,
    }
  }
}
