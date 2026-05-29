import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DeleteScheduleUseCase } from '../../schedules/use-cases/delete-schedule.use-case'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'

@Injectable()
export class DeleteDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
    private readonly deleteScheduleUseCase: DeleteScheduleUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const doctor = await this.doctorsRepository.findById(id)
    if (!doctor) throw new NotFoundException('Doctor not found')

    await this.runInTransaction(async (queryRunner) => {
      await this.deleteScheduleUseCase.deleteByDoctorId(id, queryRunner)
      await this.doctorsRepository.delete(id, queryRunner)
    })

    try {
      await this.cacheService.del(`doctor:${id}`)
      await this.cacheService.delByPattern('doctors:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteDoctorUseCase.name })
    }
  }

  async deleteByUserId(userId: string, queryRunner?: QueryRunner): Promise<void> {
    const doctor = await this.doctorsRepository.findByUserId(userId)
    if (!doctor) return

    await this.deleteScheduleUseCase.deleteByDoctorId(doctor.id, queryRunner)
    await this.doctorsRepository.delete(doctor.id, queryRunner)

    try {
      await this.cacheService.del(`doctor:${doctor.id}`)
      await this.cacheService.delByPattern('doctors:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteDoctorUseCase.name })
    }
  }
}
