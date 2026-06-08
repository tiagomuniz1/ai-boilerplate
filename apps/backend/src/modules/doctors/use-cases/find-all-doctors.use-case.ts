import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DoctorResponseDto, PaginatedDoctorsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { ListDoctorsQueryDto } from '../dto/list-doctors-query.dto'
import { Doctor } from '../entities/doctor.entity'

@Injectable()
export class FindAllDoctorsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllDoctorsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: ListDoctorsQueryDto, currentUser: ICurrentUser): Promise<PaginatedDoctorsResponseDto> {
    const { clinicId } = currentUser

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Doctor not found')
      const result: PaginatedDoctorsResponseDto = {
        data: [this.toResponse(doctor)],
        total: 1,
        page: 1,
        limit: query.limit,
      }
      return result
    }

    const { page, limit, search } = query
    const cacheKey = `doctors:list:${clinicId}:${page}:${limit}:${search ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedDoctorsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllDoctorsUseCase.name })
    }

    const [doctors, total] = await this.doctorsRepository.findAll(page, limit, clinicId, search)
    const result: PaginatedDoctorsResponseDto = {
      data: doctors.map((d) => this.toResponse(d)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllDoctorsUseCase.name })
    }

    return result
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
      specialties: (doctor.specialties ?? []).map((s) => ({ id: s.id, name: s.name })),
      bio: doctor.bio,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }
  }
}
