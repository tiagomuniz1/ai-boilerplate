import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { DoctorResponseDto, UpdateDoctorDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'

@Injectable()
export class UpdateDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.doctorsRepository.findById(id)
    if (!doctor) throw new NotFoundException('Doctor not found')

    if (dto.crmNumber && dto.crmNumber !== doctor.crmNumber) {
      const existing = await this.doctorsRepository.findByCrmNumber(dto.crmNumber)
      if (existing) throw new ConflictException('CRM number already in use')
    }

    let updated: Doctor
    try {
      updated = await this.doctorsRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`doctor:${id}`)
      await this.cacheService.delByPattern('doctors:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateDoctorUseCase.name })
    }

    return this.toResponse(updated)
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
