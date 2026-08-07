import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { DeleteScheduleUseCase } from '../../schedules/use-cases/delete-schedule.use-case'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'

@Injectable()
export class DeleteProfessionalUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteProfessionalUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
    private readonly deleteScheduleUseCase: DeleteScheduleUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const professional = await this.professionalsRepository.findById(id, clinicId)
    if (!professional) throw new NotFoundException('Professional not found')

    if (professional.userId === currentUser.id) {
      throw new ForbiddenException('Cannot delete your own professional profile')
    }

    // Block deletion while the professional still has scheduled future consultations
    // — there is no reassign/reschedule flow, so deleting would orphan them. The
    // admin must cancel those appointments first (deliberate, patient-facing action).
    const hasFutureAppointments = await this.appointmentsRepository.hasFutureByProfessionalId(id, clinicId)
    if (hasFutureAppointments) {
      throw new ConflictException(
        'Este profissional tem consultas futuras agendadas. Cancele essas consultas antes de excluí-lo.',
      )
    }

    const userId = professional.userId
    const userRole = professional.user.role
    const hasPatientProfile = await this.userHasPatientProfile(userId)

    const shouldDeleteUser = userRole === UserRole.PROFESSIONAL && !hasPatientProfile
    const shouldDemoteToPatient = userRole === UserRole.PROFESSIONAL && hasPatientProfile

    await this.runInTransaction(async (queryRunner) => {
      await this.deleteScheduleUseCase.deleteByProfessionalId(id, clinicId, queryRunner)
      await this.professionalsRepository.delete(id, queryRunner)
      if (shouldDeleteUser) {
        await this.usersRepository.delete(userId, queryRunner)
      } else if (shouldDemoteToPatient) {
        await this.usersRepository.update(userId, { role: UserRole.PATIENT, isActive: false }, queryRunner)
      }
    })

    try {
      await this.cacheService.del(`professional:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`professionals:list:${clinicId}*`)
      await this.cacheService.del(`user:${clinicId}:${userId}`)
      await this.cacheService.delByPattern(`users:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteProfessionalUseCase.name })
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
    const professional = await this.professionalsRepository.findByUserId(userId, clinicId)
    if (!professional) return

    await this.deleteScheduleUseCase.deleteByProfessionalId(professional.id, clinicId, queryRunner)
    await this.professionalsRepository.delete(professional.id, queryRunner)

    try {
      await this.cacheService.del(`professional:${clinicId}:${professional.id}`)
      await this.cacheService.delByPattern(`professionals:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteProfessionalUseCase.name })
    }
  }
}
