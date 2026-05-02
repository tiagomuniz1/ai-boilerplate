import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedUsersResponseDto, UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { PaginationDto } from '../../../common/dto/pagination.dto'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { User } from '../entities/user.entity'

@Injectable()
export class FindAllUsersUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllUsersUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(pagination: PaginationDto): Promise<PaginatedUsersResponseDto> {
    const { page, limit } = pagination
    const cacheKey = `users:list:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedUsersResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllUsersUseCase.name })
    }

    const [users, total] = await this.usersRepository.findAll(page, limit)
    const result: PaginatedUsersResponseDto = {
      data: users.map((u) => this.toResponse(u)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllUsersUseCase.name })
    }

    return result
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
