import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalCertificateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { toMedicalCertificateResponse } from './create-medical-certificate.use-case'

@Injectable()
export class FindMedicalCertificatesByAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicalCertificatesByAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<MedicalCertificateResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.DOCTOR) {
      const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const cacheKey = `medical-certificates:appointment:${appointmentId}`

    try {
      const cached = await this.cacheService.get<MedicalCertificateResponseDto[]>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindMedicalCertificatesByAppointmentUseCase.name })
    }

    const certificates = await this.medicalCertificatesRepository.findByAppointment(appointmentId, clinicId)
    const result = certificates.map(toMedicalCertificateResponse)

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindMedicalCertificatesByAppointmentUseCase.name })
    }

    return result
  }
}
