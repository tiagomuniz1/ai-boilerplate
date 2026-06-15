import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { CreatePatientDto, PatientResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'

@Injectable()
export class CreatePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreatePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreatePatientDto, currentUser: ICurrentUser): Promise<PatientResponseDto> {
    const clinicId = currentUser.clinicId!
    const isNewUser = !dto.userId

    if (isNewUser && (!dto.fullName || !dto.email)) {
      throw new UnprocessableEntityException('Either userId or fullName and email are required')
    }

    const existingDocument = await this.patientsRepository.findByDocumentNumber(dto.documentNumber, clinicId)
    if (existingDocument) throw new ConflictException('Patient with this document number already exists')

    const patientData = {
      clinicId,
      documentNumber: dto.documentNumber,
      phoneNumber: dto.phoneNumber,
      birthDate: dto.birthDate,
      gender: dto.gender,
    }

    let patient: Patient

    if (!isNewUser) {
      const user = await this.usersRepository.findById(dto.userId!, clinicId)
      if (!user) throw new NotFoundException('User not found')

      const existingProfile = await this.patientsRepository.findByUserId(dto.userId!)
      if (existingProfile) throw new ConflictException('User already has a patient profile')

      try {
        patient = await this.patientsRepository.create({ ...patientData, userId: dto.userId! })
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT)) {
          throw new ConflictException('Patient with this document number already exists')
        }
        throw error
      }
    } else {
      const existingEmail = await this.usersRepository.findByEmail(dto.email!, clinicId)
      if (existingEmail) throw new ConflictException('Email already in use')

      const hashedPassword = await bcrypt.hash(randomUUID(), 10)

      try {
        patient = await this.runInTransaction(async (queryRunner) => {
          const user = await this.usersRepository.create(
            { fullName: dto.fullName!, email: dto.email!, password: hashedPassword, role: UserRole.PATIENT, isActive: false },
            clinicId,
            queryRunner,
          )
          return this.patientsRepository.create({ ...patientData, userId: user.id }, queryRunner)
        })
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC)) {
          throw new ConflictException('Email already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT)) {
          throw new ConflictException('Patient with this document number already exists')
        }
        throw error
      }
    }

    try {
      await this.cacheService.delByPattern(`patients:list:${clinicId}*`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreatePatientUseCase.name })
    }

    return this.toResponse(patient)
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
