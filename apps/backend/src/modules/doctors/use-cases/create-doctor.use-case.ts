import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateDoctorDto, DoctorResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'

@Injectable()
export class CreateDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const user = await this.usersRepository.findById(dto.userId)
    if (!user) throw new NotFoundException('User not found')

    const existingProfile = await this.doctorsRepository.findByUserId(dto.userId)
    if (existingProfile) throw new ConflictException('User already has a doctor profile')

    const existingCrm = await this.doctorsRepository.findByCrmNumber(dto.crmNumber)
    if (existingCrm) throw new ConflictException('CRM number already in use')

    const doctor = await this.doctorsRepository.create(dto)

    try {
      await this.cacheService.delByPattern('doctors:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateDoctorUseCase.name })
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
      },
      crmNumber: doctor.crmNumber,
      specialty: doctor.specialty,
      bio: doctor.bio,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }
  }
}
