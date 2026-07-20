import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentDetailResponseDto, AppointmentPatientDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class FindAppointmentByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<AppointmentDetailResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || appointment.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to view this appointment')
      }
    }

    const [professionalName, patientDetails, specialtyName] = await Promise.all([
      this.fetchProfessionalName(appointment.professionalId),
      this.fetchPatientDetails(appointment.patientId),
      this.fetchSpecialtyName(appointment.specialtyId),
    ])

    return this.toResponse(appointment, professionalName, patientDetails, specialtyName)
  }

  private async fetchSpecialtyName(specialtyId: string | null): Promise<string | null> {
    if (!specialtyId) return null
    const rows: Array<{ name: string }> = await this.dataSource
      .createQueryBuilder()
      .select('s.name', 'name')
      .from('specialties', 's')
      .where('s.id = :specialtyId', { specialtyId })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.name ?? null
  }

  private async fetchProfessionalName(professionalId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :professionalId', { professionalId })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }

  private async fetchPatientDetails(patientId: string): Promise<AppointmentPatientDto | null> {
    const rows: Array<{
      fullName: string
      email: string
      phoneNumber: string
      birthDate: string
      documentNumber: string
      gender: string
    }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .addSelect('u.email', 'email')
      .addSelect('p.phone_number', 'phoneNumber')
      .addSelect("TO_CHAR(p.birth_date, 'YYYY-MM-DD')", 'birthDate')
      .addSelect('p.document_number', 'documentNumber')
      .addSelect('p.gender', 'gender')
      .from('patients', 'p')
      .innerJoin('users', 'u', 'u.id = p.user_id AND u.deleted_at IS NULL')
      .where('p.id = :patientId', { patientId })
      .andWhere('p.deleted_at IS NULL')
      .getRawMany()

    if (!rows[0]) return null

    const row = rows[0]
    return {
      fullName: row.fullName,
      email: row.email,
      phoneNumber: row.phoneNumber,
      birthDate: row.birthDate,
      documentNumber: row.documentNumber,
      gender: row.gender as AppointmentPatientDto['gender'],
    }
  }

  private toResponse(
    appointment: Appointment,
    professionalName: string,
    patientDetails: AppointmentPatientDto | null,
    specialtyName: string | null,
  ): AppointmentDetailResponseDto {
    const patient: AppointmentPatientDto = patientDetails ?? {
      fullName: '',
      email: '',
      phoneNumber: '',
      birthDate: '',
      documentNumber: '',
      gender: '' as AppointmentPatientDto['gender'],
    }

    return {
      id: appointment.id,
      professionalId: appointment.professionalId,
      professionalName,
      patientId: appointment.patientId,
      patientName: patient.fullName,
      specialtyId: appointment.specialtyId,
      specialtyName,
      scheduleId: appointment.scheduleId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      insuranceType: appointment.insuranceType,
      reason: appointment.reason,
      cancellationReason: appointment.cancellationReason,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      patient,
    }
  }
}
