import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { randomBytes } from 'crypto'
import { DataSource } from 'typeorm'
import {
  AppointmentStatus,
  CreatePrescriptionDto,
  PrescriptionResponseDto,
  PrescriptionSnapshot,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { resolveDoctorSigningIdentity } from '../../doctors/utils/resolve-doctor-signing-identity'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { Prescription } from '../entities/prescription.entity'

export function toPrescriptionResponse(prescription: Prescription): PrescriptionResponseDto {
  return {
    id: prescription.id,
    appointmentId: prescription.appointmentId,
    patientId: prescription.patientId,
    patientName: prescription.snapshot.patient.name,
    doctorId: prescription.doctorId,
    doctorName: prescription.snapshot.doctor.name,
    issuedAt: prescription.issuedAt,
    items: prescription.snapshot.items.map((item) => ({
      medicationId: item.medicationId,
      name: item.name,
      activeIngredient: item.activeIngredient,
      dosage: item.dosage ?? null,
      quantity: item.quantity ?? null,
      instructions: item.instructions,
    })),
    notes: prescription.snapshot.notes,
    createdAt: prescription.createdAt,
  }
}

@Injectable()
export class CreatePrescriptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreatePrescriptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreatePrescriptionDto, currentUser: ICurrentUser): Promise<PrescriptionResponseDto> {
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
      throw new UnprocessableEntityException('Cannot issue prescription for a cancelled appointment')
    }

    const items: PrescriptionSnapshot['items'] = []
    for (const item of dto.items) {
      if (item.medicationId) {
        const medication = await this.medicationsRepository.findById(item.medicationId)
        if (!medication) {
          throw new UnprocessableEntityException(`Medication not found: ${item.medicationId}`)
        }
        items.push({
          medicationId: medication.id,
          name: medication.name,
          activeIngredient: medication.activeIngredient,
          dosage: item.dosage ?? null,
          quantity: item.quantity ?? null,
          instructions: item.instructions,
        })
      } else if (item.activeIngredientName) {
        items.push({
          medicationId: null,
          name: item.activeIngredientName,
          activeIngredient: item.activeIngredientName,
          dosage: item.dosage ?? null,
          quantity: item.quantity ?? null,
          instructions: item.instructions,
        })
      } else {
        throw new UnprocessableEntityException('Each prescription item must have a medicationId or activeIngredientName')
      }
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

    const snapshot: PrescriptionSnapshot = {
      issuedAt: issuedAt.toISOString(),
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
      items,
      notes: dto.notes ?? null,
    }

    const verificationToken = randomBytes(32).toString('hex')

    const prescription = await this.prescriptionsRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      snapshot,
      verificationToken,
      issuedAt,
    })

    try {
      await this.cacheService.del(`prescriptions:appointment:${dto.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreatePrescriptionUseCase.name })
    }

    return toPrescriptionResponse(prescription)
  }
}
