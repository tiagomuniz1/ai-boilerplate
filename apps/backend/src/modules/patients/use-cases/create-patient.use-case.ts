import { ConflictException, Injectable, Logger } from '@nestjs/common'
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

    const existingDocument = await this.patientsRepository.findByDocumentNumber(dto.documentNumber, clinicId)
    if (existingDocument) throw new ConflictException('Patient with this document number already exists')

    const existingEmail = await this.usersRepository.findByEmail(dto.email)
    if (existingEmail) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(randomUUID(), 10)

    let patient: Patient
    try {
      patient = await this.runInTransaction(async (queryRunner) => {
        const user = await this.usersRepository.create(
          {
            fullName: dto.fullName,
            email: dto.email,
            password: hashedPassword,
            role: UserRole.PATIENT,
            isActive: false,
          },
          clinicId,
          queryRunner,
        )

        return this.patientsRepository.create(
          {
            userId: user.id,
            documentNumber: dto.documentNumber,
            phoneNumber: dto.phoneNumber,
            birthDate: dto.birthDate,
            gender: dto.gender,
          },
          queryRunner,
        )
      })
    } catch (error) {
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)) {
        throw new ConflictException('Email already in use')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT)) {
        throw new ConflictException('Patient with this document number already exists')
      }
      throw error
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
