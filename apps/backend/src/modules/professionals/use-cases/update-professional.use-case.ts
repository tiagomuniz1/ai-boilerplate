import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { ProfessionalRegistrationInputDto, ProfessionalResponseDto, ProfessionalSpecialtyInputDto, UpdateProfessionalDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import {
  IProfessionalsRepository,
  ProfessionalRegistrationAssignment,
  ProfessionalSpecialtyAssignment,
} from '../repositories/professionals.repository.interface'
import { Professional } from '../entities/professional.entity'

@Injectable()
export class UpdateProfessionalUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateProfessionalUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateProfessionalDto, currentUser: ICurrentUser): Promise<ProfessionalResponseDto> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const ownProfessional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!ownProfessional || ownProfessional.id !== id) {
        throw new ForbiddenException('You can only update your own professional profile')
      }
    }

    if (dto.isActive !== undefined && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change the active status')
    }

    const professional = await this.professionalsRepository.findById(id, clinicId)
    if (!professional) throw new NotFoundException('Professional not found')

    let registrations: ProfessionalRegistrationAssignment[] | null = null
    if (dto.registrations !== undefined) {
      this.validateRegistrations(dto.registrations)
      for (const registration of dto.registrations) {
        const existing = await this.professionalsRepository.findByRegistration(
          registration.councilType,
          registration.number,
          registration.state,
          clinicId,
        )
        if (existing && existing.id !== id) throw new ConflictException('Registration number already in use')
      }
      registrations = dto.registrations
    }

    let specialties: ProfessionalSpecialtyAssignment[] | null = null
    if (dto.specialties !== undefined) {
      specialties = await this.resolveSpecialties(dto.specialties)
    }

    let updated: Professional
    try {
      if (dto.isActive !== undefined) {
        await this.runInTransaction(async (queryRunner) => {
          updated = await this.professionalsRepository.update(id, dto, registrations, specialties, queryRunner)
          await this.usersRepository.update(professional.userId, { isActive: dto.isActive }, queryRunner)
        })
        updated!.user.isActive = dto.isActive
      } else {
        updated = await this.professionalsRepository.update(id, dto, registrations, specialties)
      }
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.PROFESSIONAL_REGISTRATIONS)) {
        throw new ConflictException('Registration number already in use')
      }
      throw error
    }

    try {
      await this.cacheService.del(`professional:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`professionals:list:${clinicId}*`)
      if (dto.isActive !== undefined) {
        await this.cacheService.del(`user:${clinicId}:${professional.userId}`)
        await this.cacheService.delByPattern(`users:list:${clinicId}*`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateProfessionalUseCase.name })
    }

    return this.toResponse(updated!)
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
}
