import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { UpdateUserDto, UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
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

  async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id)
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
      await this.cacheService.del(`user:${id}`)
      await this.cacheService.delByPattern('users:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateUserUseCase.name, userId: id })
    }

    return this.toResponse(updated)
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
