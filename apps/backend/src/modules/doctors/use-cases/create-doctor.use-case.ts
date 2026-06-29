import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { CreateDoctorDto, DoctorResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'

@Injectable()
export class CreateDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
    private readonly sendSetPasswordEmailUseCase: SendSetPasswordEmailUseCase,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateDoctorDto, currentUser: ICurrentUser): Promise<DoctorResponseDto> {
    const clinicId = currentUser.clinicId!
    const isNewUser = !dto.userId

    if (isNewUser && (!dto.fullName || !dto.email)) {
      throw new UnprocessableEntityException('Either userId or fullName and email are required')
    }

    const existingCrm = await this.doctorsRepository.findByCrmNumber(dto.crmNumber, clinicId)
    if (existingCrm) throw new ConflictException('CRM number already in use')

    const uniqueIds = [...new Set(dto.specialtyIds)]
    const specialties = await this.specialtiesRepository.findByIds(uniqueIds)
    if (specialties.length !== uniqueIds.length) {
      throw new UnprocessableEntityException('One or more specialty IDs not found')
    }

    let doctor: Doctor

    let promotedUserId: string | undefined

    if (!isNewUser) {
      const user = await this.usersRepository.findById(dto.userId!, clinicId)
      if (!user) throw new NotFoundException('User not found')

      const existingProfile = await this.doctorsRepository.findByUserId(dto.userId!, clinicId)
      if (existingProfile) throw new ConflictException('User already has a doctor profile')

      const needsRolePromotion = user.role === UserRole.PATIENT

      try {
        if (needsRolePromotion) {
          doctor = await this.runInTransaction(async (queryRunner) => {
            await this.usersRepository.update(user.id, { role: UserRole.DOCTOR, isActive: true }, queryRunner)
            return this.doctorsRepository.create({ ...dto, userId: dto.userId! }, clinicId, specialties, queryRunner)
          })
          promotedUserId = dto.userId!
        } else {
          doctor = await this.doctorsRepository.create({ ...dto, userId: dto.userId! }, clinicId, specialties)
        }
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_CRM)) {
          throw new ConflictException('CRM number already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_USER_ID)) {
          throw new ConflictException('User already has a doctor profile')
        }
        throw error
      }
    } else {
      const existingEmail = await this.usersRepository.findByEmail(dto.email!, clinicId)
      if (existingEmail) throw new ConflictException('Email already in use')

      const hashedPassword = await bcrypt.hash(randomUUID(), 10)

      try {
        doctor = await this.runInTransaction(async (queryRunner) => {
          const user = await this.usersRepository.create(
            { fullName: dto.fullName!, email: dto.email!, password: hashedPassword, role: UserRole.DOCTOR, isActive: true },
            clinicId,
            queryRunner,
          )
          return this.doctorsRepository.create({ ...dto, userId: user.id }, clinicId, specialties, queryRunner)
        })
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC)) {
          throw new ConflictException('Email already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_CRM)) {
          throw new ConflictException('CRM number already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_USER_ID)) {
          throw new ConflictException('User already has a doctor profile')
        }
        throw error
      }
    }

    try {
      await this.cacheService.delByPattern(`doctors:list:${clinicId}*`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
      if (promotedUserId) {
        await this.cacheService.del(`user:${clinicId}:${promotedUserId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateDoctorUseCase.name })
    }

    if (isNewUser) {
      await this.sendSetPasswordEmailUseCase.execute(doctor.user.id, clinicId)
    }

    return this.toResponse(doctor)
  }

  private toResponse(doctor: Doctor): DoctorResponseDto {
    return {
      id: doctor.id,
      user: {
        id: doctor.user.id,
        fullName: doctor.user.fullName,
        email: doctor.user.email,
        isActive: doctor.user.isActive,
      },
      crmNumber: doctor.crmNumber,
      specialties: doctor.specialties.map((s) => ({ id: s.id, name: s.name })),
      bio: doctor.bio,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }
  }
}
