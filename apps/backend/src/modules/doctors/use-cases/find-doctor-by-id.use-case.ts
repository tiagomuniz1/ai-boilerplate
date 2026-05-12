import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DoctorResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'

@Injectable()
export class FindDoctorByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindDoctorByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<DoctorResponseDto> {
    const cacheKey = `doctor:${id}`

    try {
      const cached = await this.cacheService.get<DoctorResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindDoctorByIdUseCase.name })
    }

    const doctor = await this.doctorsRepository.findById(id)
    if (!doctor) throw new NotFoundException('Doctor not found')

    const response = this.toResponse(doctor)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindDoctorByIdUseCase.name })
    }

    return response
  }

  private toResponse(doctor: Doctor): DoctorResponseDto {
    return {
      id: doctor.id,
      user: {
        id: doctor.user.id,
        fullName: doctor.user.fullName,
        email: doctor.user.email,
      },
      crmNumber: doctor.crmNumber,
      specialty: doctor.specialty,
      bio: doctor.bio,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }
  }
}
