import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { INotificationAdapter } from '../adapters/notification.adapter.interface'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { User } from '../entities/user.entity'

@Injectable()
export class ActivateUserUseCase extends BaseUseCase {
  private readonly logger = new Logger(ActivateUserUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly notificationAdapter: INotificationAdapter,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<UserResponseDto> {
    const clinicId = currentUser.clinicId!
    const user = await this.usersRepository.findById(id, clinicId)
    if (!user) throw new NotFoundException('User not found')
    if (user.isActive) throw new UnprocessableEntityException('User is already active')

    const activated = await this.usersRepository.update(id, { isActive: true })

    try {
      await this.notificationAdapter.sendAccountActivationEmail(user.email, user.fullName)
    } catch {
      this.logger.warn('Failed to send activation email', { context: ActivateUserUseCase.name, userId: id })
    }

    try {
      await this.cacheService.del(`user:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: ActivateUserUseCase.name, userId: id })
    }

    return this.toResponse(activated)
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isProfessional: false,
      isPatient: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
