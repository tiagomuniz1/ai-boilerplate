import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreatePatientDto, PatientResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class CreatePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreatePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreatePatientDto): Promise<PatientResponseDto> {
    const existing = await this.patientsRepository.findByDocumentNumber(dto.documentNumber)
    if (existing) throw new ConflictException('Patient with this document number already exists')

    const patient = await this.patientsRepository.create(dto)

    try {
      await this.cacheService.delByPattern('patients:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreatePatientUseCase.name })
    }

    return this.toResponse(patient)
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
