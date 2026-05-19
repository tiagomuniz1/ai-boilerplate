import { ConflictException, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { CreatePatientDto, PatientResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
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

  async execute(dto: CreatePatientDto): Promise<PatientResponseDto> {
    const existingDocument = await this.patientsRepository.findByDocumentNumber(dto.documentNumber)
    if (existingDocument) throw new ConflictException('Patient with this document number already exists')

    const existingEmail = await this.usersRepository.findByEmail(dto.email)
    if (existingEmail) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(randomUUID(), 10)

    const patient = await this.runInTransaction(async (queryRunner) => {
      const user = await this.usersRepository.create(
        {
          fullName: dto.fullName,
          email: dto.email,
          password: hashedPassword,
          role: UserRole.PATIENT,
          isActive: false,
        },
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
