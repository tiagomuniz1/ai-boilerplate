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
  CreateVaccineIndicationDto,
  VaccineIndicationResponseDto,
  VaccineIndicationSnapshot,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { resolveProfessionalSigningIdentity } from '../../professionals/utils/resolve-professional-signing-identity'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IVaccinesRepository } from '../../vaccines/repositories/vaccines.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { VaccineIndication } from '../entities/vaccine-indication.entity'

export function toVaccineIndicationResponse(
  indication: VaccineIndication,
): VaccineIndicationResponseDto {
  return {
    id: indication.id,
    appointmentId: indication.appointmentId,
    patientId: indication.patientId,
    patientName: indication.snapshot.patient.name,
    professionalId: indication.professionalId,
    professionalName: indication.snapshot.professional.name,
    issuedAt: indication.issuedAt,
    items: indication.snapshot.items.map((item) => ({
      vaccineId: item.vaccineId,
      name: item.name,
      abbreviation: item.abbreviation,
      doseLabel: item.doseLabel,
      instructions: item.instructions,
    })),
    notes: indication.snapshot.notes,
    createdAt: indication.createdAt,
  }
}

@Injectable()
export class CreateVaccineIndicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateVaccineIndicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    dto: CreateVaccineIndicationDto,
    currentUser: ICurrentUser,
  ): Promise<VaccineIndicationResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    // Exercer vem da ficha, não do cargo: um ADMIN que também atende indica
    // normalmente, um ADMIN sem ficha não indica nada. E indicar exige ser o
    // profissional DA CONSULTA: o documento sai com nome, conselho e registro de
    // quem assina, e emitir sobre consulta alheia poria o registro de uma pessoa
    // num documento que ela não redigiu.
    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional || professional.id !== appointment.professionalId) {
      throw new ForbiddenException('Insufficient permissions')
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new UnprocessableEntityException('Cannot issue vaccine indication for a cancelled appointment')
    }

    const items: VaccineIndicationSnapshot['items'] = []
    for (const item of dto.items) {
      const vaccine = await this.vaccinesRepository.findById(item.vaccineId)
      // Vacina desativada no catálogo não pode ser indicada: desativar existe
      // justamente para tirar de circulação o que não deve mais ser aplicado.
      if (!vaccine || !vaccine.isActive) {
        throw new UnprocessableEntityException(`Vaccine not found: ${item.vaccineId}`)
      }
      items.push({
        vaccineId: vaccine.id,
        name: vaccine.name,
        abbreviation: vaccine.abbreviation,
        doseLabel: item.doseLabel ?? null,
        instructions: item.instructions ?? null,
      })
    }

    const clinic = await this.findClinicByIdUseCase.execute(clinicId)

    const { councilType, registrationNumber, registryNumber, specialtyName } =
      resolveProfessionalSigningIdentity(
        professional,
        appointment.specialtyId,
        dto.registrationId,
        dto.specialtyId,
      )

    const patient = await this.patientsRepository.findById(appointment.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const issuedAt = new Date()

    const snapshot: VaccineIndicationSnapshot = {
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
      professional: {
        name: professional.user.fullName,
        councilType,
        registrationNumber,
        registryNumber,
        specialtyName,
      },
      patient: {
        name: patient.user.fullName,
        documentNumber: patient.documentNumber,
      },
      items,
      notes: dto.notes ?? null,
    }

    const indication = await this.vaccineIndicationsRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      snapshot,
      issuedAt,
    })

    try {
      await this.cacheService.del(`vaccine-indications:appointment:${dto.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateVaccineIndicationUseCase.name })
    }

    return toVaccineIndicationResponse(indication)
  }
}
