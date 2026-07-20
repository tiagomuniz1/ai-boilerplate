import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedProfessionalsResponseDto, ProfessionalResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { ListProfessionalsQueryDto } from '../dto/list-professionals-query.dto'
import { Professional } from '../entities/professional.entity'

@Injectable()
export class FindAllProfessionalsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllProfessionalsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: ListProfessionalsQueryDto, currentUser: ICurrentUser): Promise<PaginatedProfessionalsResponseDto> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      const result: PaginatedProfessionalsResponseDto = {
        data: [this.toResponse(professional)],
        total: 1,
        page: 1,
        limit: query.limit,
      }
      return result
    }

    const { page, limit, search } = query
    const cacheKey = `professionals:list:${clinicId}:${page}:${limit}:${search ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedProfessionalsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllProfessionalsUseCase.name })
    }

    const [professionals, total] = await this.professionalsRepository.findAll(page, limit, clinicId, search)
    const result: PaginatedProfessionalsResponseDto = {
      data: professionals.map((p) => this.toResponse(p)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllProfessionalsUseCase.name })
    }

    return result
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
