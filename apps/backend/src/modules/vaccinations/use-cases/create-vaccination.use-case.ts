import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateVaccinationDto, VaccinationResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IVaccinesRepository } from '../../vaccines/repositories/vaccines.repository.interface'
import { IVaccinationsRepository } from '../repositories/vaccinations.repository.interface'
import { toVaccinationResponse } from '../vaccination.mapper'

@Injectable()
export class CreateVaccinationUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateVaccinationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinationsRepository: IVaccinationsRepository,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateVaccinationDto, currentUser: ICurrentUser): Promise<VaccinationResponseDto> {
    const clinicId = currentUser.clinicId!

    // Registrar é exercício, e exercício vem da ficha, não do cargo: um ADMIN
    // que também atende registra; um ADMIN sem ficha, não.
    //
    // Ao contrário de receita e atestado, NÃO se exige ser o profissional da
    // consulta. Ali a regra existe porque o documento leva assinatura
    // verificável publicamente; aqui não há assinatura — o registro apenas
    // guarda quem transcreveu a caderneta.
    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional) throw new ForbiddenException('Insufficient permissions')

    const patient = await this.patientsRepository.findById(dto.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const vaccine = await this.vaccinesRepository.findById(dto.vaccineId)
    if (!vaccine) throw new UnprocessableEntityException(`Vaccine not found: ${dto.vaccineId}`)
    if (!vaccine.isActive) {
      throw new UnprocessableEntityException('Cannot record a dose of an inactive vaccine')
    }

    // Consulta é opcional; quando vem, tem que ser desta clínica e deste
    // paciente — senão o vínculo mentiria sobre onde o registro nasceu.
    if (dto.appointmentId) {
      const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      if (appointment.patientId !== dto.patientId) {
        throw new UnprocessableEntityException('Appointment belongs to a different patient')
      }
    }

    // Data futura seria erro de digitação: a caderneta registra o que já foi
    // aplicado. A Fase 2 é quem lida com dose planejada.
    if (dto.appliedAt > new Date().toISOString().slice(0, 10)) {
      throw new UnprocessableEntityException('Cannot record a dose applied in the future')
    }

    const vaccination = await this.vaccinationsRepository.create({
      clinicId,
      patientId: dto.patientId,
      vaccineId: dto.vaccineId,
      appointmentId: dto.appointmentId ?? null,
      recordedByProfessionalId: professional.id,
      doseLabel: dto.doseLabel,
      appliedAt: dto.appliedAt,
      appliedAtOurClinic: dto.appliedAtOurClinic ?? false,
      appliedAtDescription: dto.appliedAtDescription ?? null,
      lotNumber: dto.lotNumber ?? null,
      manufacturer: dto.manufacturer ?? null,
      notes: dto.notes ?? null,
    })

    try {
      await this.cacheService.delByPattern(`vaccinations:patient:${dto.patientId}*`)
      if (dto.appointmentId) {
        await this.cacheService.del(`vaccinations:appointment:${dto.appointmentId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateVaccinationUseCase.name })
    }

    return toVaccinationResponse(vaccination)
  }
}
