import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  AppointmentStatus,
  CreateMedicalCertificateDto,
  MedicalCertificateResponseDto,
  MedicalCertificateSnapshot,
  MedicalCertificateType,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { resolveDoctorSigningIdentity } from '../../doctors/utils/resolve-doctor-signing-identity'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { MedicalCertificate } from '../entities/medical-certificate.entity'

export function toMedicalCertificateResponse(certificate: MedicalCertificate): MedicalCertificateResponseDto {
  return {
    id: certificate.id,
    appointmentId: certificate.appointmentId,
    patientId: certificate.patientId,
    patientName: certificate.snapshot.patient.name,
    doctorId: certificate.doctorId,
    doctorName: certificate.snapshot.doctor.name,
    type: certificate.snapshot.type,
    daysOff: certificate.snapshot.daysOff,
    startDate: certificate.snapshot.startDate,
    cidCode: certificate.snapshot.cidCode,
    attendanceDate: certificate.snapshot.attendanceDate,
    checkInTime: certificate.snapshot.checkInTime,
    checkOutTime: certificate.snapshot.checkOutTime,
    observations: certificate.snapshot.observations,
    issuedAt: certificate.issuedAt,
    createdAt: certificate.createdAt,
  }
}

@Injectable()
export class CreateMedicalCertificateUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicalCertificateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateMedicalCertificateDto, currentUser: ICurrentUser): Promise<MedicalCertificateResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    let doctorForRbac = null
    if (currentUser.role === UserRole.DOCTOR) {
      doctorForRbac = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctorForRbac || doctorForRbac.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new UnprocessableEntityException('Cannot issue medical certificate for a cancelled appointment')
    }

    const clinic = await this.findClinicByIdUseCase.execute(clinicId)

    const doctor = doctorForRbac ?? (await this.doctorsRepository.findById(appointment.doctorId, clinicId))
    if (!doctor) throw new NotFoundException('Doctor not found')

    const { crmNumber, rqe, specialtyName } = resolveDoctorSigningIdentity(
      doctor,
      appointment.specialtyId,
      dto.crmId,
      dto.specialtyId,
    )

    const patient = await this.patientsRepository.findById(appointment.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const issuedAt = new Date()
    const isLeave = dto.type === MedicalCertificateType.LEAVE

    const snapshot: MedicalCertificateSnapshot = {
      issuedAt: issuedAt.toISOString(),
      type: dto.type,
      clinic: {
        name: clinic.name,
        address: clinic.address
          ? {
              street: clinic.address.street,
              number: clinic.address.number,
              complement: clinic.address.complement ?? null,
              neighborhood: clinic.address.neighborhood,
              city: clinic.address.city,
              state: clinic.address.state,
              zipCode: clinic.address.zipCode,
            }
          : null,
        logoUrl: clinic.logoUrl,
      },
      doctor: {
        name: doctor.user.fullName,
        crmNumber,
        rqe,
        specialtyName,
      },
      patient: {
        name: patient.user.fullName,
        documentNumber: patient.documentNumber,
      },
      daysOff: isLeave ? dto.daysOff : null,
      startDate: isLeave ? dto.startDate : null,
      cidCode: isLeave ? (dto.cidCode ?? null) : null,
      attendanceDate: isLeave ? null : dto.attendanceDate,
      checkInTime: isLeave ? null : dto.checkInTime,
      checkOutTime: isLeave ? null : dto.checkOutTime,
      observations: dto.observations ?? null,
    }

    const certificate = await this.medicalCertificatesRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      snapshot,
      issuedAt,
    })

    try {
      await this.cacheService.del(`medical-certificates:appointment:${dto.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateMedicalCertificateUseCase.name })
    }

    return toMedicalCertificateResponse(certificate)
  }
}
