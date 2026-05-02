import { ConflictException, Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { CreateUserDto, UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
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

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = await this.usersRepository.create({ ...dto, password: hashedPassword })

    try {
      await this.cacheService.delByPattern('users:list*')
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
