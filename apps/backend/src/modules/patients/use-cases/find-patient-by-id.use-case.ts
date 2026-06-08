import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PatientResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class FindPatientByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindPatientByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<PatientResponseDto> {
    const { clinicId } = currentUser
    const cacheKey = `patient:${clinicId}:${id}`

    try {
      const cached = await this.cacheService.get<PatientResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindPatientByIdUseCase.name })
    }

    const patient = await this.patientsRepository.findById(id, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const response = this.toResponse(patient)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindPatientByIdUseCase.name })
    }

    return response
  }

  private toResponse(patient: Patient): PatientResponseDto {
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
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }
  }
}
