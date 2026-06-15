import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { DeleteScheduleUseCase } from '../../schedules/use-cases/delete-schedule.use-case'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'

@Injectable()
export class DeleteDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
    private readonly deleteScheduleUseCase: DeleteScheduleUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const doctor = await this.doctorsRepository.findById(id, clinicId)
    if (!doctor) throw new NotFoundException('Doctor not found')

    if (doctor.userId === currentUser.id) {
      throw new ForbiddenException('Cannot delete your own doctor profile')
    }

    const userId = doctor.userId
    const userRole = doctor.user.role
    const hasPatientProfile = await this.userHasPatientProfile(userId)

    const shouldDeleteUser = userRole === UserRole.DOCTOR && !hasPatientProfile
    const shouldDemoteToPatient = userRole === UserRole.DOCTOR && hasPatientProfile

    await this.runInTransaction(async (queryRunner) => {
      await this.deleteScheduleUseCase.deleteByDoctorId(id, clinicId, queryRunner)
      await this.doctorsRepository.delete(id, queryRunner)
      if (shouldDeleteUser) {
        await this.usersRepository.delete(userId, queryRunner)
      } else if (shouldDemoteToPatient) {
        await this.usersRepository.update(userId, { role: UserRole.PATIENT, isActive: false }, queryRunner)
      }
    })

    try {
      await this.cacheService.del(`doctor:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`doctors:list:${clinicId}*`)
      await this.cacheService.del(`user:${clinicId}:${userId}`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteDoctorUseCase.name })
    }
  }

  private async userHasPatientProfile(userId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource
      .createQueryBuilder()
      .select('1')
      .from('patients', 'p')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.deleted_at IS NULL')
      .limit(1)
      .getRawMany()
    return rows.length > 0
  }

  async deleteByUserId(userId: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const doctor = await this.doctorsRepository.findByUserId(userId, clinicId)
    if (!doctor) return

    await this.deleteScheduleUseCase.deleteByDoctorId(doctor.id, clinicId, queryRunner)
    await this.doctorsRepository.delete(doctor.id, queryRunner)

    try {
      await this.cacheService.del(`doctor:${clinicId}:${doctor.id}`)
      await this.cacheService.delByPattern(`doctors:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteDoctorUseCase.name })
    }
  }
}
