import { ConflictException, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { RegisterClinicDto, RegisterClinicResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from '../../../common/utils/db-constraint.utils'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'
import { User } from '../../users/entities/user.entity'

@Injectable()
export class RegisterClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(RegisterClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: RegisterClinicDto): Promise<RegisterClinicResponseDto> {
    const slug = dto.slug ?? this.generateSlug(dto.clinicName)


    const RESERVED_SLUGS = ['backoffice']
    if (RESERVED_SLUGS.includes(slug)) throw new ConflictException('Slug is reserved and cannot be used')
    const existingClinic = await this.clinicsRepository.findBySlug(slug)
    if (existingClinic) throw new ConflictException('Slug already in use')

    const existingUser = await this.usersRepository.findByEmail(dto.adminEmail)
    if (existingUser) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10)

    let clinic: Clinic
    let admin: User

    try {
      const result = await this.runInTransaction(async (queryRunner) => {
        const newClinic = await this.clinicsRepository.create({ name: dto.clinicName, slug }, queryRunner)
        const newAdmin = await this.usersRepository.create(
          {
            fullName: dto.adminFullName,
            email: dto.adminEmail,
            password: hashedPassword,
            role: UserRole.ADMIN,
            isActive: true,
          },
          newClinic.id,
          queryRunner,
        )
        return { clinic: newClinic, admin: newAdmin }
      })
      clinic = result.clinic
      admin = result.admin
    } catch (error) {
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.CLINICS_SLUG)) {
        throw new ConflictException('Slug already in use')
      }
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL_CLINIC)) {
        throw new ConflictException('Email already in use')
      }
      throw error
    }

    try {
      await Promise.all([
        this.cacheService.delByPattern('clinics:list*'),
        this.cacheService.delByPattern('users:list*'),
      ])
    } catch {
      this.logger.warn('Cache invalidation failed', { context: RegisterClinicUseCase.name })
    }

    return {
      clinic: { id: clinic.id, name: clinic.name, slug: clinic.slug },
      admin: { id: admin.id, fullName: admin.fullName, email: admin.email },
    }
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
}
