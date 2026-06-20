import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateMedicalRecordDto, MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { FindTemplateByClinicAndSpecialtyUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-specialty.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { MedicalRecord } from '../entities/medical-record.entity'
import { CacheService } from '../../../cache/cache.service'

export function toMedicalRecordResponse(record: MedicalRecord): MedicalRecordResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    patientName: record.patient.user.fullName,
    doctorId: record.doctorId,
    doctorName: record.doctor.user.fullName,
    specialtyId: record.specialtyId,
    specialtyName: record.specialty.name,
    templateId: record.templateId,
    templateSchemaSnapshot: record.templateSchemaSnapshot,
    data: record.data,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

@Injectable()
export class CreateMedicalRecordUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicalRecordUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly findTemplateByClinicAndSpecialtyUseCase: FindTemplateByClinicAndSpecialtyUseCase,
    private readonly validateRecordDataService: ValidateRecordDataService,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateMedicalRecordDto, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    if (!appointment.specialtyId) {
      throw new UnprocessableEntityException('Appointment has no specialty defined')
    }

    const specialtyId = appointment.specialtyId

    const template = await this.findTemplateByClinicAndSpecialtyUseCase.execute(clinicId, specialtyId)
    if (!template) {
      throw new NotFoundException('No active template found for this specialty')
    }

    if (template.specialtyId !== specialtyId) {
      this.logger.error('Template specialty mismatch', {
        templateId: template.id,
        templateSpecialtyId: template.specialtyId,
        appointmentSpecialtyId: specialtyId,
      })
      throw new UnprocessableEntityException('Template does not belong to the appointment specialty')
    }

    this.validateRecordDataService.validate(dto.data, template.fields)

    const existing = await this.medicalRecordsRepository.findByAppointment(dto.appointmentId, clinicId)
    if (existing) throw new ConflictException('A medical record already exists for this appointment')

    const record = await this.medicalRecordsRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      specialtyId,
      templateId: template.id,
      templateSchemaSnapshot: template.fields,
      data: dto.data,
      notes: dto.notes ?? null,
    })

    try {
      await this.cacheService.delByPattern(`medical_records:patient:${appointment.patientId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: 'CreateMedicalRecordUseCase' })
    }

    return toMedicalRecordResponse(record)
  }
}
