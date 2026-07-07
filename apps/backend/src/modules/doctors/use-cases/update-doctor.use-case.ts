import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { DoctorCrmInputDto, DoctorResponseDto, DoctorSpecialtyInputDto, UpdateDoctorDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { DoctorCrmAssignment, DoctorSpecialtyAssignment, IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { Doctor } from '../entities/doctor.entity'

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
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.DOCTOR) {
      const ownDoctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!ownDoctor || ownDoctor.id !== id) {
        throw new ForbiddenException('You can only update your own doctor profile')
      }
    }

    if (dto.isActive !== undefined && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change the active status')
    }

    const doctor = await this.doctorsRepository.findById(id, clinicId)
    if (!doctor) throw new NotFoundException('Doctor not found')

    let crms: DoctorCrmAssignment[] | null = null
    if (dto.crms !== undefined) {
      this.validateCrms(dto.crms)
      for (const crm of dto.crms) {
        const existing = await this.doctorsRepository.findByCrm(crm.number, crm.state, clinicId)
        if (existing && existing.id !== id) throw new ConflictException('CRM number already in use')
      }
      crms = dto.crms
    }

    let specialties: DoctorSpecialtyAssignment[] | null = null
    if (dto.specialties !== undefined) {
      specialties = await this.resolveSpecialties(dto.specialties)
    }

    let updated: Doctor
    try {
      if (dto.isActive !== undefined) {
        await this.runInTransaction(async (queryRunner) => {
          updated = await this.doctorsRepository.update(id, dto, crms, specialties, queryRunner)
          await this.usersRepository.update(doctor.userId, { isActive: dto.isActive }, queryRunner)
        })
        updated!.user.isActive = dto.isActive
      } else {
        updated = await this.doctorsRepository.update(id, dto, crms, specialties)
      }
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.DOCTOR_CRMS)) {
        throw new ConflictException('CRM number already in use')
      }
      throw error
    }

    try {
      await this.cacheService.del(`doctor:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`doctors:list:${clinicId}*`)
      if (dto.isActive !== undefined) {
        await this.cacheService.del(`user:${clinicId}:${doctor.userId}`)
        await this.cacheService.delByPattern(`users:list:${clinicId}*`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateDoctorUseCase.name })
    }

    return this.toResponse(updated!)
  }

  private validateCrms(crms: DoctorCrmInputDto[]): void {
    const primaryCount = crms.filter((crm) => crm.isPrimary).length
    if (primaryCount !== 1) {
      throw new UnprocessableEntityException('Exactly one primary CRM is required')
    }
    const seen = new Set<string>()
    for (const crm of crms) {
      const key = `${crm.number}/${crm.state}`
      if (seen.has(key)) throw new UnprocessableEntityException('Duplicate CRM in payload')
      seen.add(key)
    }
  }

  private async resolveSpecialties(items: DoctorSpecialtyInputDto[]): Promise<DoctorSpecialtyAssignment[]> {
    const uniqueIds = [...new Set(items.map((item) => item.specialtyId))]
    if (uniqueIds.length !== items.length) {
      throw new UnprocessableEntityException('Duplicate specialty in payload')
    }
    const specialties = await this.specialtiesRepository.findByIds(uniqueIds)
    if (specialties.length !== uniqueIds.length) {
      throw new UnprocessableEntityException('One or more specialty IDs not found')
    }
    const byId = new Map(specialties.map((specialty) => [specialty.id, specialty]))
    return items.map((item) => ({
      specialty: byId.get(item.specialtyId)!,
      rqe: item.rqe && item.rqe.length > 0 ? item.rqe : null,
    }))
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
      crms: (doctor.crms ?? []).map((crm) => ({ id: crm.id, number: crm.number, state: crm.state, isPrimary: crm.isPrimary })),
      specialties: (doctor.doctorSpecialties ?? []).map((ds) => ({ id: ds.specialty.id, name: ds.specialty.name, rqe: ds.rqe })),
      bio: doctor.bio,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    }
  }
}
