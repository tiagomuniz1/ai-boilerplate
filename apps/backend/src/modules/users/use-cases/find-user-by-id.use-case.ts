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

    const response = this.toResponse(user)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindUserByIdUseCase.name, userId: id })
    }

    return response
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
