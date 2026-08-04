import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedPatientsResponseDto, PatientResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { ListPatientsQueryDto } from '../dto/list-patients-query.dto'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class ListPatientsUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListPatientsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: ListPatientsQueryDto, currentUser: ICurrentUser): Promise<PaginatedPatientsResponseDto> {
    const { page, limit, search, excludeDependents, excludeId } = query
    const clinicId = currentUser.clinicId!
    const cacheKey = `patients:list:${clinicId}:${page}:${limit}:${search ?? 'all'}:${excludeDependents ?? false}:${excludeId ?? 'none'}`

    try {
      const cached = await this.cacheService.get<PaginatedPatientsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListPatientsUseCase.name })
    }

    const [patients, total] = await this.patientsRepository.findAll(
      page,
      limit,
      clinicId,
      search,
      excludeDependents,
      excludeId,
    )

    const responsibleIds = [...new Set(patients.map((p) => p.responsiblePatientId).filter((id): id is string => !!id))]
    const pageIds = patients.map((p) => p.id)

    const [responsibleRefs, dependentRefs] = await Promise.all([
      this.patientsRepository.findResponsiblePatientsByIds(responsibleIds, clinicId),
      this.patientsRepository.findDependentsByResponsibleIds(pageIds, clinicId),
    ])

    const responsibleById = new Map(responsibleRefs.map((r) => [r.id, r]))
    const dependentsByResponsibleId = new Map<string, Patient[]>()
    for (const dependent of dependentRefs) {
      const list = dependentsByResponsibleId.get(dependent.responsiblePatientId!) ?? []
      list.push(dependent)
      dependentsByResponsibleId.set(dependent.responsiblePatientId!, list)
    }

    const result: PaginatedPatientsResponseDto = {
      data: patients.map((p) =>
        this.toResponse(
          p,
          p.responsiblePatientId ? (responsibleById.get(p.responsiblePatientId) ?? null) : null,
          dependentsByResponsibleId.get(p.id) ?? [],
        ),
      ),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: ListPatientsUseCase.name })
    }

    return result
  }

  private toResponse(patient: Patient, responsiblePatient: Patient | null, dependents: Patient[]): PatientResponseDto {
    return {
      id: patient.id,
      user: {
        id: patient.user.id,
        fullName: patient.user.fullName,
        email: patient.user.email,
        isActive: patient.user.isActive,
      },
      documentNumber: patient.documentNumber,
      phoneNumber: patient.phoneNumber,
      birthDate: patient.birthDate,
      gender: patient.gender,
      responsiblePatientId: patient.responsiblePatientId,
      kinshipType: patient.kinshipType,
      responsiblePatient: responsiblePatient
        ? {
            id: responsiblePatient.id,
            fullName: responsiblePatient.user.fullName,
            documentNumber: responsiblePatient.documentNumber,
          }
        : null,
      dependents: dependents.map((d) => ({ id: d.id, fullName: d.user.fullName, kinshipType: d.kinshipType! })),
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }
  }
}
