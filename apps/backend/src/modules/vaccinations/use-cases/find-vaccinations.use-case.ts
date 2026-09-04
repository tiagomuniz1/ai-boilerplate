import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedVaccinationsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { VaccinationListQueryDto } from '../dto/vaccination-list-query.dto'
import { IVaccinationsRepository } from '../repositories/vaccinations.repository.interface'
import { toVaccinationResponse } from '../vaccination.mapper'

@Injectable()
export class FindVaccinationsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindVaccinationsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinationsRepository: IVaccinationsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: VaccinationListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedVaccinationsResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page, limit } = query

    // A recepcionista não lê caderneta: é dado clínico, na mesma linha do
    // histórico de prontuários e da galeria de fotos.
    if (currentUser.role === UserRole.USER) {
      throw new ForbiddenException('Insufficient permissions')
    }

    if (query.appointmentId) {
      const vaccinations = await this.vaccinationsRepository.findByAppointment(
        query.appointmentId,
        clinicId,
      )
      return { data: vaccinations.map(toVaccinationResponse), total: vaccinations.length, page, limit }
    }

    if (!query.patientId) {
      // Caderneta é sempre de alguém. Sem recorte, a rota devolveria a clínica
      // inteira, que não é leitura que exista no produto.
      throw new NotFoundException('patientId or appointmentId is required')
    }

    const patient = await this.patientsRepository.findById(query.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const cacheKey = `vaccinations:patient:${query.patientId}:${page}:${limit}`
    try {
      const cached = await this.cacheService.get<PaginatedVaccinationsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindVaccinationsUseCase.name })
    }

    const [vaccinations, total] = await this.vaccinationsRepository.findByPatient(
      query.patientId,
      clinicId,
      page,
      limit,
    )

    const result: PaginatedVaccinationsResponseDto = {
      data: vaccinations.map(toVaccinationResponse),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindVaccinationsUseCase.name })
    }

    return result
  }
}
