import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { PatientResponseDto, UpdatePatientDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class UpdatePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdatePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findById(id)
    if (!patient) throw new NotFoundException('Patient not found')

    const { fullName, email, ...patientFields } = dto
    const hasUserUpdate = fullName !== undefined || email !== undefined
    const hasPatientUpdate = Object.values(patientFields).some((v) => v !== undefined)

    if (email && email !== patient.user.email) {
      const existing = await this.usersRepository.findByEmail(email)
      if (existing) throw new ConflictException('Email already in use')
    }

    try {
      if (hasUserUpdate && hasPatientUpdate) {
        await this.runInTransaction(async (queryRunner) => {
          await this.usersRepository.update(patient.userId, { fullName, email }, queryRunner)
          await this.patientsRepository.update(id, patientFields, queryRunner)
        })
      } else if (hasUserUpdate) {
        await this.usersRepository.update(patient.userId, { fullName, email })
      } else if (hasPatientUpdate) {
        await this.patientsRepository.update(id, patientFields)
      }
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)) {
        throw new ConflictException('Email already in use')
      }
      throw error
    }

    const updated = (await this.patientsRepository.findById(id))!

    try {
      await this.cacheService.del(`patient:${id}`)
      await this.cacheService.delByPattern('patients:list*')
      if (hasUserUpdate) {
        await this.cacheService.del(`user:${patient.userId}`)
        await this.cacheService.delByPattern('users:list*')
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdatePatientUseCase.name })
    }

    return this.toResponse(updated)
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
