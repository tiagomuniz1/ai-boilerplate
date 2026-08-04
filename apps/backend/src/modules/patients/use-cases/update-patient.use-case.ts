import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { PatientResponseDto, UpdatePatientDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
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

  async execute(id: string, dto: UpdatePatientDto, currentUser: ICurrentUser): Promise<PatientResponseDto> {
    const clinicId = currentUser.clinicId!

    const patient = await this.patientsRepository.findById(id, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const { fullName, email, ...patientFields } = dto
    const hasUserUpdate = fullName !== undefined || email !== undefined
    const hasPatientUpdate = Object.values(patientFields).some((v) => v !== undefined)

    if (email && email !== patient.user.email) {
      const existing = await this.usersRepository.findByEmail(email, clinicId)
      if (existing) throw new ConflictException('Email already in use')
    }

    if (dto.documentNumber !== undefined) {
      const existingDocument = await this.patientsRepository.findByDocumentNumber(dto.documentNumber, clinicId)
      if (existingDocument && existingDocument.id !== id) {
        throw new ConflictException('Patient with this document number already exists')
      }
    }

    const responsiblePatientId = dto.responsiblePatientId
    if (responsiblePatientId !== undefined) {
      if (responsiblePatientId === null) {
        const resultingDocumentNumber = dto.documentNumber ?? patient.documentNumber
        if (!resultingDocumentNumber) {
          throw new UnprocessableEntityException('documentNumber is required to remove the responsible patient link')
        }
        patientFields.kinshipType = null
      } else {
        if (responsiblePatientId === id) {
          throw new UnprocessableEntityException('A patient cannot be their own responsible patient')
        }
        const responsible = await this.patientsRepository.findById(responsiblePatientId, clinicId)
        if (!responsible) throw new NotFoundException('Responsible patient not found')
        if (responsible.responsiblePatientId) {
          throw new UnprocessableEntityException('The responsible patient cannot itself be a dependent')
        }
        if (!dto.kinshipType) {
          throw new UnprocessableEntityException('kinshipType is required when setting responsiblePatientId')
        }
        const ownDependents = await this.patientsRepository.findActiveDependents(id, clinicId)
        if (ownDependents.length > 0) {
          throw new ConflictException(
            "Cannot link a patient that already has its own dependents as someone else's dependent",
          )
        }
      }
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
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC)) {
        throw new ConflictException('Email already in use')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT)) {
        throw new ConflictException('Patient with this document number already exists')
      }
      throw error
    }

    const updated = (await this.patientsRepository.findById(id, clinicId))!

    let responsiblePatientRef: Patient | null = null
    if (updated.responsiblePatientId) {
      responsiblePatientRef = await this.patientsRepository.findById(updated.responsiblePatientId, clinicId)
    }
    const dependents = await this.patientsRepository.findActiveDependents(id, clinicId)

    try {
      await this.cacheService.del(`patient:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`patients:list:${clinicId}*`)
      if (hasUserUpdate) {
        await this.cacheService.del(`user:${clinicId}:${patient.userId}`)
        await this.cacheService.delByPattern(`users:list:${clinicId}*`)
      }
      if (patient.responsiblePatientId) {
        await this.cacheService.del(`patient:${clinicId}:${patient.responsiblePatientId}`)
      }
      if (dto.responsiblePatientId) {
        await this.cacheService.del(`patient:${clinicId}:${dto.responsiblePatientId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdatePatientUseCase.name })
    }

    return this.toResponse(updated, responsiblePatientRef, dependents)
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
