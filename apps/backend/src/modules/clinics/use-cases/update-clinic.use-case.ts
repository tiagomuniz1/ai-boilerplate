import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { ClinicResponseDto, SUBSCRIPTION_PLANS, UpdateClinicDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { Clinic } from '../entities/clinic.entity'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'

@Injectable()
export class UpdateClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
    private readonly clinicResponseMapper: ClinicResponseMapper,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateClinicDto): Promise<ClinicResponseDto> {
    const clinic = await this.clinicsRepository.findById(id)
    if (!clinic) throw new NotFoundException('Clinic not found')

    if (dto.slug !== undefined && dto.slug !== clinic.slug) {
      const RESERVED_SLUGS = ['backoffice']
      if (RESERVED_SLUGS.includes(dto.slug)) throw new ConflictException('Slug is reserved and cannot be used')
      const existing = await this.clinicsRepository.findBySlug(dto.slug)
      if (existing) throw new ConflictException('Slug already in use')
    }

    // Block downgrading to a plan whose cap is below the clinic's current
    // professional count — the admin must remove professionals (or pick another
    // plan) first, instead of silently leaving the clinic over its limit.
    if (dto.plan !== undefined && dto.plan !== clinic.plan) {
      const { label, maxProfessionals } = SUBSCRIPTION_PLANS[dto.plan]
      if (maxProfessionals !== null) {
        const current = await this.professionalsRepository.countByClinic(id)
        if (current > maxProfessionals) {
          throw new UnprocessableEntityException(
            `Esta clínica tem ${current} profissionais; o plano ${label} permite no máximo ${maxProfessionals}.`,
          )
        }
      }
    }

    let updated: Clinic
    try {
      updated = await this.clinicsRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`clinic:${id}`)
      await this.cacheService.delByPattern('clinics:list*')
      if ('themeId' in dto) {
        await this.cacheService.del(`theme:clinic:${id}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateClinicUseCase.name })
    }

    return this.clinicResponseMapper.toResponse(updated)
  }
}
