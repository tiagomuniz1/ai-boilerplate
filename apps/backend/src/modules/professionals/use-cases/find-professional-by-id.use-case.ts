import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ProfessionalResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { Professional } from '../entities/professional.entity'

@Injectable()
export class FindProfessionalByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindProfessionalByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ProfessionalResponseDto> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const ownProfessional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!ownProfessional || ownProfessional.id !== id) {
        throw new ForbiddenException('You can only view your own professional profile')
      }
    }

    const cacheKey = `professional:${clinicId}:${id}`

    try {
      const cached = await this.cacheService.get<ProfessionalResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindProfessionalByIdUseCase.name })
    }

    const professional = await this.professionalsRepository.findById(id, clinicId)
    if (!professional) throw new NotFoundException('Professional not found')

    const response = this.toResponse(professional)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindProfessionalByIdUseCase.name })
    }

    return response
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
