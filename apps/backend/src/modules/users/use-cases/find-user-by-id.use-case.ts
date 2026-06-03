import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { User } from '../entities/user.entity'

@Injectable()
export class FindUserByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<UserResponseDto> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only view your own profile')
    }

    const cacheKey = `user:${id}`

    try {
      const cached = await this.cacheService.get<UserResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindUserByIdUseCase.name, userId: id })
    }

    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')

    const [isDoctor, isPatient] = await Promise.all([
      this.hasProfile('doctors', user.id),
      this.hasProfile('patients', user.id),
    ])

    const response = this.toResponse(user, isDoctor, isPatient)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindUserByIdUseCase.name, userId: id })
    }

    return response
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
