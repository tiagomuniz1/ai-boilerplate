import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { AppointmentStatus, MedicalRecordResponseDto, UpdateMedicalRecordDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { CacheService } from '../../../cache/cache.service'
import { toMedicalRecordResponse } from './create-medical-record.use-case'

@Injectable()
export class UpdateMedicalRecordUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateMedicalRecordUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly validateRecordDataService: ValidateRecordDataService,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateMedicalRecordDto, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== record.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const appointment = await this.appointmentsRepository.findById(record.appointmentId, clinicId)
    if (appointment?.status === AppointmentStatus.COMPLETED) {
      throw new UnprocessableEntityException('Cannot edit a medical record after the appointment is completed')
    }

    if (dto.data !== undefined) {
      this.validateRecordDataService.validate(dto.data, record.templateSchemaSnapshot)
    }

    try {
      const updated = await this.medicalRecordsRepository.update(id, {
        data: dto.data,
        notes: dto.notes,
      }, clinicId)

      try {
        await this.cacheService.delByPattern(`medical_records:patient:${record.patientId}*`)
      } catch {
        this.logger.warn('Cache invalidation failed', { context: 'UpdateMedicalRecordUseCase' })
      }

      return toMedicalRecordResponse(updated)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }
  }
}
