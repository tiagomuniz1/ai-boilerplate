import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateDoctorDto, DoctorResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
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

  async execute(dto: CreateDoctorDto, currentUser: ICurrentUser): Promise<DoctorResponseDto> {
    const { clinicId } = currentUser

    const user = await this.usersRepository.findById(dto.userId, clinicId)
    if (!user) throw new NotFoundException('User not found')

    const existingProfile = await this.doctorsRepository.findByUserId(dto.userId, clinicId)
    if (existingProfile) throw new ConflictException('User already has a doctor profile')

    const existingCrm = await this.doctorsRepository.findByCrmNumber(dto.crmNumber, clinicId)
    if (existingCrm) throw new ConflictException('CRM number already in use')

    const uniqueIds = [...new Set(dto.specialtyIds)]
    const specialties = await this.specialtiesRepository.findByIds(uniqueIds)
    if (specialties.length !== uniqueIds.length) {
      throw new UnprocessableEntityException('One or more specialty IDs not found')
    }

    let doctor: Doctor
    try {
      doctor = await this.doctorsRepository.create(dto, specialties)
    } catch (error) {
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_CRM)) {
        throw new ConflictException('CRM number already in use')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTORS_USER_ID)) {
        throw new ConflictException('User already has a doctor profile')
      }
      throw error
    }

    try {
      await this.cacheService.delByPattern(`doctors:list:${clinicId}*`)
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
