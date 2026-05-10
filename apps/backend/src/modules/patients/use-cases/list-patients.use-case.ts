import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedPatientsResponseDto, PatientResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
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

  async execute(query: ListPatientsQueryDto): Promise<PaginatedPatientsResponseDto> {
    const { page, limit, search } = query
    const cacheKey = `patients:list:${page}:${limit}:${search ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedPatientsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListPatientsUseCase.name })
    }

    const [patients, total] = await this.patientsRepository.findAll(page, limit, search)
    const result: PaginatedPatientsResponseDto = {
      data: patients.map((p) => this.toResponse(p)),
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

  private toResponse(patient: Patient): PatientResponseDto {
    return {
      id: patient.id,
      fullName: patient.fullName,
      documentNumber: patient.documentNumber,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      birthDate: patient.birthDate,
      gender: patient.gender,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }
  }
}
