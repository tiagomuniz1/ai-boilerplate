import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, PaginatedUsersResponseDto, UserResponseDto } from '@app/shared'
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
    const [professionalUserIds, patientUserIds, professionCouncilTypes] = await Promise.all([
      this.getDoctorUserIds(userIds),
      this.getPatientUserIds(userIds),
      this.getProfessionCouncilTypes(userIds),
    ])

    const result: PaginatedUsersResponseDto = {
      data: users.map((u) => this.toResponse(u, professionalUserIds, patientUserIds, professionCouncilTypes)),
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
      .from('professionals', 'd')
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

  private async getProfessionCouncilTypes(userIds: string[]): Promise<Map<string, CouncilType>> {
    if (userIds.length === 0) return new Map()
    const rows: Array<{ user_id: string; council_type: CouncilType }> = await this.dataSource
      .createQueryBuilder()
      .select('d.user_id', 'user_id')
      .addSelect('r.council_type', 'council_type')
      .from('professionals', 'd')
      .innerJoin(
        'professional_registrations',
        'r',
        'r.professional_id = d.id AND r.is_primary = true AND r.deleted_at IS NULL',
      )
      .where('d.user_id IN (:...userIds)', { userIds })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.user_id, r.council_type]))
  }

  private toResponse(
    user: User,
    professionalUserIds: Set<string>,
    patientUserIds: Set<string>,
    professionCouncilTypes: Map<string, CouncilType>,
  ): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isProfessional: professionalUserIds.has(user.id),
      isPatient: patientUserIds.has(user.id),
      councilType: professionCouncilTypes.get(user.id) ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
