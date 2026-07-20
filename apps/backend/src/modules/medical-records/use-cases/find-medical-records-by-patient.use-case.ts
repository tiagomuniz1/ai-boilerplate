import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, PaginatedMedicalRecordsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { MedicalRecordListQueryDto } from '../dto/medical-record-list-query.dto'
import { toMedicalRecordResponse } from './create-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

@Injectable()
export class FindMedicalRecordsByPatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicalRecordsByPatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    patientId: string,
    query: MedicalRecordListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordsResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page, limit } = query

    let doctorIdFilter: string | undefined = query.doctorId

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      doctorIdFilter = doctor?.id
    }

    const cacheKey = `medical_records:patient:${patientId}:${page}:${limit}:${doctorIdFilter ?? 'all'}`
    try {
      const cached = await this.cacheService.get<PaginatedMedicalRecordsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: 'FindMedicalRecordsByPatientUseCase' })
    }

    const [records, total] = await this.medicalRecordsRepository.findByPatient(
      clinicId,
      patientId,
      page,
      limit,
      doctorIdFilter,
    )

    const data: MedicalRecordResponseDto[] = records.map(toMedicalRecordResponse)
    const result: PaginatedMedicalRecordsResponseDto = { data, total, page, limit }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: 'FindMedicalRecordsByPatientUseCase' })
    }

    return result
  }
}
