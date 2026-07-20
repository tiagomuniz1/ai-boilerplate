import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import {
  CreateProfessionalDto,
  ProfessionalRegistrationInputDto,
  ProfessionalResponseDto,
  ProfessionalSpecialtyInputDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IProfessionalsRepository, ProfessionalSpecialtyAssignment } from '../repositories/professionals.repository.interface'
import { Professional } from '../entities/professional.entity'

@Injectable()
export class CreateProfessionalUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateProfessionalUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
    private readonly sendSetPasswordEmailUseCase: SendSetPasswordEmailUseCase,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateProfessionalDto, currentUser: ICurrentUser): Promise<ProfessionalResponseDto> {
    const clinicId = currentUser.clinicId!
    const isNewUser = !dto.userId

    if (isNewUser && (!dto.fullName || !dto.email)) {
      throw new UnprocessableEntityException('Either userId or fullName and email are required')
    }

    this.validateRegistrations(dto.registrations)
    for (const registration of dto.registrations) {
      const existing = await this.professionalsRepository.findByRegistration(
        registration.councilType,
        registration.number,
        registration.state,
        clinicId,
      )
      if (existing) throw new ConflictException('Registration number already in use')
    }

    const specialties = await this.resolveSpecialties(dto.specialties)

    let professional: Professional
    let promotedUserId: string | undefined

    if (!isNewUser) {
      const user = await this.usersRepository.findById(dto.userId!, clinicId)
      if (!user) throw new NotFoundException('User not found')

      const existingProfile = await this.professionalsRepository.findByUserId(dto.userId!, clinicId)
      if (existingProfile) throw new ConflictException('User already has a professional profile')

      const needsRolePromotion = user.role === UserRole.PATIENT

      try {
        if (needsRolePromotion) {
          professional = await this.runInTransaction(async (queryRunner) => {
            await this.usersRepository.update(user.id, { role: UserRole.DOCTOR, isActive: true }, queryRunner)
            return this.professionalsRepository.create(
              { userId: dto.userId!, bio: dto.bio ?? null },
              clinicId,
              dto.registrations,
              specialties,
              queryRunner,
            )
          })
          promotedUserId = dto.userId!
        } else {
          professional = await this.professionalsRepository.create(
            { userId: dto.userId!, bio: dto.bio ?? null },
            clinicId,
            dto.registrations,
            specialties,
          )
        }
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS)) {
          throw new ConflictException('Registration number already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PROFESSIONALS_USER_ID)) {
          throw new ConflictException('User already has a professional profile')
        }
        throw error
      }
    } else {
      const existingEmail = await this.usersRepository.findByEmail(dto.email!, clinicId)
      if (existingEmail) throw new ConflictException('Email already in use')

      const hashedPassword = await bcrypt.hash(randomUUID(), 10)

      try {
        professional = await this.runInTransaction(async (queryRunner) => {
          const user = await this.usersRepository.create(
            { fullName: dto.fullName!, email: dto.email!, password: hashedPassword, role: UserRole.DOCTOR, isActive: true },
            clinicId,
            queryRunner,
          )
          return this.professionalsRepository.create(
            { userId: user.id, bio: dto.bio ?? null },
            clinicId,
            dto.registrations,
            specialties,
            queryRunner,
          )
        })
      } catch (error) {
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC)) {
          throw new ConflictException('Email already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS)) {
          throw new ConflictException('Registration number already in use')
        }
        if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PROFESSIONALS_USER_ID)) {
          throw new ConflictException('User already has a professional profile')
        }
        throw error
      }
    }

    try {
      await this.cacheService.delByPattern(`professionals:list:${clinicId}*`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
      if (promotedUserId) {
        await this.cacheService.del(`user:${clinicId}:${promotedUserId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateProfessionalUseCase.name })
    }

    if (isNewUser) {
      await this.sendSetPasswordEmailUseCase.execute(professional.user.id, clinicId)
    }

    return this.toResponse(professional)
  }

  private toResponse(professional: Professional): ProfessionalResponseDto {
    return {
      id: professional.id,
      user: {
        id: professional.user.id,
        fullName: professional.user.fullName,
        email: professional.user.email,
        isActive: professional.user.isActive,
      },
      registrations: (professional.registrations ?? []).map((registration) => ({
        id: registration.id,
        councilType: registration.councilType,
        number: registration.number,
        state: registration.state,
        isPrimary: registration.isPrimary,
      })),
      specialties: (professional.professionalSpecialties ?? []).map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        registryNumber: ps.registryNumber,
      })),
      bio: professional.bio,
      createdAt: professional.createdAt,
      updatedAt: professional.updatedAt,
    }
  }

  private validateRegistrations(registrations: ProfessionalRegistrationInputDto[]): void {
    const primaryCount = registrations.filter((registration) => registration.isPrimary).length
    if (primaryCount !== 1) {
      throw new UnprocessableEntityException('Exactly one primary registration is required')
    }
    const seen = new Set<string>()
    for (const registration of registrations) {
      const key = `${registration.councilType}/${registration.number}/${registration.state}`
      if (seen.has(key)) throw new UnprocessableEntityException('Duplicate registration in payload')
      seen.add(key)
    }
  }

  private async resolveSpecialties(items: ProfessionalSpecialtyInputDto[]): Promise<ProfessionalSpecialtyAssignment[]> {
    const uniqueIds = [...new Set(items.map((item) => item.specialtyId))]
    if (uniqueIds.length !== items.length) {
      throw new UnprocessableEntityException('Duplicate specialty in payload')
    }
    const specialties = await this.specialtiesRepository.findByIds(uniqueIds)
    if (specialties.length !== uniqueIds.length) {
      throw new UnprocessableEntityException('One or more specialty IDs not found')
    }
    const byId = new Map(specialties.map((specialty) => [specialty.id, specialty]))
    return items.map((item) => ({
      specialty: byId.get(item.specialtyId)!,
      registryNumber: item.registryNumber && item.registryNumber.length > 0 ? item.registryNumber : null,
    }))
  }
}
