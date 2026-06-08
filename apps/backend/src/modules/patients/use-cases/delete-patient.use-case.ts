import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'

@Injectable()
export class DeletePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeletePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const { clinicId } = currentUser

    const patient = await this.patientsRepository.findById(id, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    if (patient.userId === currentUser.id) {
      throw new ForbiddenException('Cannot delete your own patient record')
    }

    const userId = patient.userId

    await this.runInTransaction(async (queryRunner) => {
      await this.patientsRepository.delete(id, queryRunner)
      await this.usersRepository.delete(userId, queryRunner)
    })

    try {
      await this.cacheService.del(`patient:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`patients:list:${clinicId}*`)
      await this.cacheService.del(`user:${clinicId}:${userId}`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeletePatientUseCase.name })
    }
  }

  async deleteByUserId(userId: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const patient = await this.patientsRepository.findByUserId(userId)
    if (!patient) return

    await this.patientsRepository.delete(patient.id, queryRunner)

    try {
      await this.cacheService.del(`patient:${clinicId}:${patient.id}`)
      await this.cacheService.delByPattern(`patients:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeletePatientUseCase.name })
    }
  }
}
