import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DeleteDoctorUseCase } from '../../doctors/use-cases/delete-doctor.use-case'
import { DeletePatientUseCase } from '../../patients/use-cases/delete-patient.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'

@Injectable()
export class DeleteUserUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
    private readonly deleteDoctorUseCase: DeleteDoctorUseCase,
    private readonly deletePatientUseCase: DeletePatientUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) throw new ForbiddenException('Cannot delete your own account')

    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')

    await this.runInTransaction(async (queryRunner) => {
      await this.deleteDoctorUseCase.deleteByUserId(id, queryRunner)
      await this.deletePatientUseCase.deleteByUserId(id, queryRunner)
      await this.usersRepository.delete(id, queryRunner)
    })

    try {
      await this.cacheService.del(`user:${id}`)
      await this.cacheService.delByPattern('users:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteUserUseCase.name, userId: id })
    }
  }
}
