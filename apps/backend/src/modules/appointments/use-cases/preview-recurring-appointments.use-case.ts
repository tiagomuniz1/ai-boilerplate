import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  PreviewRecurringAppointmentsDto,
  PreviewRecurringAppointmentsResponseDto,
  RECURRENCE_INTERVAL_IN_WEEKS,
  RecurringOccurrenceAvailability,
  RecurringOccurrencePreviewDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { generateRecurringDates, getDayOfWeekFromDate } from '../utils/recurrence.util'
import { ResolveProfessionalSlotUseCase } from './resolve-professional-slot.use-case'

@Injectable()
export class PreviewRecurringAppointmentsUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly resolveProfessionalSlotUseCase: ResolveProfessionalSlotUseCase,
  ) {
    super(dataSource)
  }

  async execute(
    dto: PreviewRecurringAppointmentsDto,
    currentUser: ICurrentUser,
  ): Promise<PreviewRecurringAppointmentsResponseDto> {
    const clinicId = currentUser.clinicId!

    let professionalId: string
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      professionalId = professional.id
    } else {
      if (!dto.professionalId) {
        throw new UnprocessableEntityException('professionalId is required for admin')
      }
      const professional = await this.professionalsRepository.findById(dto.professionalId, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      professionalId = professional.id
    }

    const patient = await this.patientsRepository.findById(dto.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const { dates, truncatedByMaximumOccurrences, truncatedByHorizon } = generateRecurringDates({
      anchorDate: dto.date,
      intervalInWeeks: RECURRENCE_INTERVAL_IN_WEEKS[dto.recurrenceInterval],
      occurrenceCount: dto.occurrenceCount,
      untilDate: dto.untilDate,
    })

    if (dates.length === 0) {
      throw new UnprocessableEntityException('untilDate must be on or after the first occurrence date')
    }

    const nowUtc = new Date()
    const occurrences: RecurringOccurrencePreviewDto[] = []

    for (const date of dates) {
      occurrences.push(await this.previewOccurrence(professionalId, clinicId, date, dto.startTime, nowUtc))
    }

    const availableOccurrenceCount = occurrences.filter((occurrence) => occurrence.selectable).length

    return {
      professionalId,
      patientId: dto.patientId,
      recurrenceInterval: dto.recurrenceInterval,
      dayOfWeek: getDayOfWeekFromDate(dto.date),
      startTime: dto.startTime,
      occurrences,
      availableOccurrenceCount,
      unavailableOccurrenceCount: occurrences.length - availableOccurrenceCount,
      truncatedByMaximumOccurrences,
      truncatedByHorizon,
    }
  }

  private async previewOccurrence(
    professionalId: string,
    clinicId: string,
    date: string,
    startTime: string,
    nowUtc: Date,
  ): Promise<RecurringOccurrencePreviewDto> {
    // Brazil is always UTC-3 (DST abolished in 2019), matching create-appointment.
    // Checked before hitting the database: a past date can never be bookable, so
    // there is nothing to look up.
    if (new Date(`${date}T${startTime}:00-03:00`) <= nowUtc) {
      return {
        date,
        startTime,
        endTime: null,
        scheduleId: null,
        availability: RecurringOccurrenceAvailability.IN_THE_PAST,
        selectable: false,
      }
    }

    const resolution = await this.resolveProfessionalSlotUseCase.executeDetailed(
      professionalId,
      clinicId,
      date,
      startTime,
    )

    return {
      date,
      startTime,
      endTime: resolution.endTime,
      scheduleId: resolution.scheduleId,
      availability: resolution.availability,
      selectable: resolution.availability === RecurringOccurrenceAvailability.AVAILABLE,
    }
  }
}
