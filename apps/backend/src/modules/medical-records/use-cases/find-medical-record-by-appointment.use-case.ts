import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { toMedicalRecordResponse } from './create-medical-record.use-case'

@Injectable()
export class FindMedicalRecordByAppointmentUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto | null> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const record = await this.medicalRecordsRepository.findByAppointment(appointmentId, clinicId)
    if (!record) return null

    return toMedicalRecordResponse(record)
  }
}
