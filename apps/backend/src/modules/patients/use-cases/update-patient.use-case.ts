import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { PatientResponseDto, UpdatePatientDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class UpdatePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdatePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findById(id)
    if (!patient) throw new NotFoundException('Patient not found')

    let updated: Patient
    try {
      updated = await this.patientsRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`patient:${id}`)
      await this.cacheService.delByPattern('patients:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdatePatientUseCase.name })
    }

    return this.toResponse(updated)
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
