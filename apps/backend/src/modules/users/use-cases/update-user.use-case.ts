import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { UpdateUserDto, UserResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { User } from '../entities/user.entity'

@Injectable()
export class UpdateUserUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateUserDto, currentUser: ICurrentUser): Promise<UserResponseDto> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile')
    }

    const { clinicId } = currentUser
    const user = await this.usersRepository.findById(id, clinicId)
    if (!user) throw new NotFoundException('User not found')

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email)
      if (existing) throw new ConflictException('Email already in use')
    }

    let updated: User
    try {
      updated = await this.usersRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`user:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateUserUseCase.name, userId: id })
    }

    const [isDoctor, isPatient] = await Promise.all([
      this.hasProfile('doctors', updated.id),
      this.hasProfile('patients', updated.id),
    ])

    return this.toResponse(updated, isDoctor, isPatient)
  }

  private async hasProfile(table: 'doctors' | 'patients', userId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource
      .createQueryBuilder()
      .select('1')
      .from(table, 't')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.deleted_at IS NULL')
      .limit(1)
      .getRawMany()
    return rows.length > 0
  }

  private toResponse(user: User, isDoctor: boolean, isPatient: boolean): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isDoctor,
      isPatient,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
