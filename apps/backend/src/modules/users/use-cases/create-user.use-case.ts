import { ConflictException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { CreateUserDto, UserResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import {
  DB_UNIQUE_CONSTRAINTS,
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from '../../../common/utils/db-constraint.utils'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { User } from '../entities/user.entity'

@Injectable()
export class CreateUserUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateUserDto, currentUser: ICurrentUser): Promise<UserResponseDto> {
    let clinicId: string
    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (!dto.clinicId) {
        throw new UnprocessableEntityException('clinicId is required when creating a user as platform admin')
      }
      clinicId = dto.clinicId
    } else {
      clinicId = currentUser.clinicId!
    }

    const existing = await this.usersRepository.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    let user: User
    try {
      user = await this.usersRepository.create({ ...dto, password: hashedPassword }, clinicId)
    } catch (error) {
      if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)) {
        throw new ConflictException('Email already in use')
      }
      if (isForeignKeyViolation(error)) {
        throw new UnprocessableEntityException('Clinic not found')
      }
      throw error
    }

    try {
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateUserUseCase.name })
    }

    return this.toResponse(user)
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isDoctor: false,
      isPatient: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
