import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicSpecialtyResponseDto, PaginatedClinicSpecialtiesResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'
import { ClinicSpecialtiesListQueryDto } from '../dto/clinic-specialties-list-query.dto'

@Injectable()
export class FindClinicSpecialtiesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindClinicSpecialtiesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicSpecialtiesRepository: IClinicSpecialtiesRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    clinicId: string,
    query: ClinicSpecialtiesListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedClinicSpecialtiesResponseDto> {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.clinicId !== clinicId
    ) {
      throw new ForbiddenException('Insufficient permissions')
    }

    await this.findClinicByIdUseCase.execute(clinicId)

    const { page = 1, limit = 20, search } = query
    const cacheKey = `clinic-specialties:${clinicId}:${page}:${limit}:${search ?? ''}`

    try {
      const cached = await this.cacheService.get<PaginatedClinicSpecialtiesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindClinicSpecialtiesUseCase.name })
    }

    const [records, total] = await this.clinicSpecialtiesRepository.findByClinicId(
      clinicId,
      page,
      limit,
      search,
    )

    const result: PaginatedClinicSpecialtiesResponseDto = {
      data: records.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindClinicSpecialtiesUseCase.name })
    }

    return result
  }

  private toResponse(record: ClinicSpecialty): ClinicSpecialtyResponseDto {
    return {
      id: record.id,
      clinicId: record.clinicId,
      specialtyId: record.specialtyId,
      name: record.specialty.name,
      description: record.specialty.description,
      linkedAt: record.createdAt,
    }
  }
}
