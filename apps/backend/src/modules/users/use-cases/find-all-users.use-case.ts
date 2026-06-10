import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedUsersResponseDto, UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListUsersQueryDto } from '../dto/list-users-query.dto'
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

  async execute(query: ListUsersQueryDto, currentUser: ICurrentUser): Promise<PaginatedUsersResponseDto> {
    const { page, limit, search } = query
    const clinicId = currentUser.clinicId!
    const cacheKey = `users:list:${clinicId}:${page}:${limit}:${search ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedUsersResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllUsersUseCase.name })
    }

    const [users, total] = await this.usersRepository.findAll(page, limit, clinicId, search)

    const userIds = users.map((u) => u.id)
    const [doctorUserIds, patientUserIds] = await Promise.all([
      this.getDoctorUserIds(userIds),
      this.getPatientUserIds(userIds),
    ])

    const result: PaginatedUsersResponseDto = {
      data: users.map((u) => this.toResponse(u, doctorUserIds, patientUserIds)),
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

  private async getDoctorUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set()
    const rows: Array<{ user_id: string }> = await this.dataSource
      .createQueryBuilder()
      .select('d.user_id', 'user_id')
      .from('doctors', 'd')
      .where('d.user_id IN (:...userIds)', { userIds })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return new Set(rows.map((r) => r.user_id))
  }

  private async getPatientUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set()
    const rows: Array<{ user_id: string }> = await this.dataSource
      .createQueryBuilder()
      .select('p.user_id', 'user_id')
      .from('patients', 'p')
      .where('p.user_id IN (:...userIds)', { userIds })
      .andWhere('p.deleted_at IS NULL')
      .getRawMany()
    return new Set(rows.map((r) => r.user_id))
  }

  private toResponse(user: User, doctorUserIds: Set<string>, patientUserIds: Set<string>): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isDoctor: doctorUserIds.has(user.id),
      isPatient: patientUserIds.has(user.id),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
