import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateDoctorDto, DoctorResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
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

    const uniqueIds = [...new Set(dto.specialtyIds)]
    const specialties = await this.specialtiesRepository.findByIds(uniqueIds)
    if (specialties.length !== uniqueIds.length) {
      throw new UnprocessableEntityException('One or more specialty IDs not found')
    }

    const doctor = await this.doctorsRepository.create(dto, specialties)

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
