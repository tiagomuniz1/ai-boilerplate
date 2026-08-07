import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, ReassignCandidateDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { isEligibleReassignTarget } from '../utils/reassign-eligibility.util'
import { ResolveProfessionalSlotUseCase } from './resolve-professional-slot.use-case'

// Clinics hold a small number of professionals and the list is already narrowed
// to a single specialty/profession, so scanning every professional in the clinic
// is acceptable here.
const MAX_PROFESSIONALS_PER_CLINIC = 200

@Injectable()
export class GetReassignCandidatesUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly resolveProfessionalSlotUseCase: ResolveProfessionalSlotUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ReassignCandidateDto[]> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new UnprocessableEntityException(
        'Só é possível trocar o profissional de consultas agendadas.',
      )
    }

    const original = await this.professionalsRepository.findById(appointment.professionalId, clinicId)
    if (!original) throw new NotFoundException('Professional not found')

    const [professionals] = await this.professionalsRepository.findAll(
      1,
      MAX_PROFESSIONALS_PER_CLINIC,
      clinicId,
    )

    const specialtyName = await this.fetchSpecialtyName(appointment.specialtyId)

    const eligible = professionals.filter((professional) =>
      isEligibleReassignTarget(professional, original, appointment.specialtyId),
    )

    const candidates: ReassignCandidateDto[] = []
    for (const professional of eligible) {
      const slot = await this.resolveProfessionalSlotUseCase.execute(
        professional.id,
        clinicId,
        appointment.date,
        appointment.startTime,
      )
      if (!slot) continue
      candidates.push({
        professionalId: professional.id,
        professionalName: professional.user.fullName,
        specialtyName,
      })
    }

    return candidates
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
}
