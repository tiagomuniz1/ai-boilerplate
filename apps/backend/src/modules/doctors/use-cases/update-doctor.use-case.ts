import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { DoctorResponseDto, UpdateDoctorDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

@Injectable()
export class UpdateDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateDoctorDto, currentUser: ICurrentUser): Promise<DoctorResponseDto> {
    if (currentUser.role === UserRole.DOCTOR) {
      const ownDoctor = await this.doctorsRepository.findByUserId(currentUser.id)
      if (!ownDoctor || ownDoctor.id !== id) {
        throw new ForbiddenException('You can only update your own doctor profile')
      }
    }

    if (dto.isActive !== undefined && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change the active status')
    }

    const doctor = await this.doctorsRepository.findById(id)
    if (!doctor) throw new NotFoundException('Doctor not found')

    if (dto.crmNumber && dto.crmNumber !== doctor.crmNumber) {
      const existing = await this.doctorsRepository.findByCrmNumber(dto.crmNumber)
      if (existing) throw new ConflictException('CRM number already in use')
    }

    let specialties: Specialty[] | null = null
    if (dto.specialtyIds !== undefined) {
      const uniqueIds = [...new Set(dto.specialtyIds)]
      specialties = await this.specialtiesRepository.findByIds(uniqueIds)
      if (specialties.length !== uniqueIds.length) {
        throw new UnprocessableEntityException('One or more specialty IDs not found')
      }
    }

    let updated: Doctor
    try {
      if (dto.isActive !== undefined) {
        await this.runInTransaction(async (queryRunner) => {
          updated = await this.doctorsRepository.update(id, dto, specialties, queryRunner)
          await this.usersRepository.update(doctor.userId, { isActive: dto.isActive }, queryRunner)
        })
        updated!.user.isActive = dto.isActive
      } else {
        updated = await this.doctorsRepository.update(id, dto, specialties)
      }
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`doctor:${id}`)
      await this.cacheService.delByPattern('doctors:list*')
      if (dto.isActive !== undefined) {
        await this.cacheService.del(`user:${doctor.userId}`)
        await this.cacheService.delByPattern('users:list*')
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateDoctorUseCase.name })
    }

    return this.toResponse(updated!)
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
