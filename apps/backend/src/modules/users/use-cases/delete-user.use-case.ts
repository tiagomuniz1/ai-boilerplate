import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../repositories/users.repository.interface'

@Injectable()
export class DeleteUserUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')

    await this.usersRepository.delete(id)

    try {
      await this.cacheService.del(`user:${id}`)
      await this.cacheService.delByPattern('users:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteUserUseCase.name, userId: id })
    }
  }
}
