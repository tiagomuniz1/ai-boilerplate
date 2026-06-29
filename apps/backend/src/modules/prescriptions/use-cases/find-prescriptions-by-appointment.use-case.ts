import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PrescriptionResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { toPrescriptionResponse } from './create-prescription.use-case'

@Injectable()
export class FindPrescriptionsByAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindPrescriptionsByAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<PrescriptionResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.DOCTOR) {
      const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const cacheKey = `prescriptions:appointment:${appointmentId}`

    try {
      const cached = await this.cacheService.get<PrescriptionResponseDto[]>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindPrescriptionsByAppointmentUseCase.name })
    }

    const prescriptions = await this.prescriptionsRepository.findByAppointment(appointmentId, clinicId)
    const result = prescriptions.map(toPrescriptionResponse)

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindPrescriptionsByAppointmentUseCase.name })
    }

    return result
  }
}
