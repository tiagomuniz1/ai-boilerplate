import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AvailabilityResponseDto, AvailableSlotDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { GetActiveSchedulesForDoctorUseCase } from '../../schedules/use-cases/get-active-schedules-for-doctor.use-case'
import { GetActiveExceptionsForDoctorUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-doctor.use-case'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { AvailabilityQueryDto } from '../dto/availability-query.dto'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function generateSlots(schedule: Schedule): AvailableSlotDto[] {
  const slots: AvailableSlotDto[] = []
  const start = timeToMinutes(schedule.startTime)
  const end = timeToMinutes(schedule.endTime)
  const duration = schedule.slotDurationInMinutes

  for (let t = start; t + duration <= end; t += duration) {
    slots.push({
      startTime: minutesToTime(t),
      endTime: minutesToTime(t + duration),
      scheduleId: schedule.id,
      slotDurationInMinutes: duration,
    })
  }
  return slots
}

@Injectable()
export class GetAvailabilityUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetAvailabilityUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly getActiveSchedulesUseCase: GetActiveSchedulesForDoctorUseCase,
    private readonly getActiveExceptionsUseCase: GetActiveExceptionsForDoctorUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: AvailabilityQueryDto, currentUser: ICurrentUser): Promise<AvailabilityResponseDto> {
    const clinicId = currentUser.clinicId!

    let doctorId: string
    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      doctorId = doctor.id
    } else {
      if (!query.doctorId) throw new UnprocessableEntityException('doctorId is required')
      const doctor = await this.professionalsRepository.findById(query.doctorId, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      doctorId = doctor.id
    }

    const cacheKey = `appointments:availability:${clinicId}:${doctorId}:${query.date}`

    try {
      const cached = await this.cacheService.get<AvailabilityResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetAvailabilityUseCase.name })
    }

    const schedules = await this.getActiveSchedulesUseCase.execute(doctorId, clinicId, query.date)

    const allSlots: AvailableSlotDto[] = schedules.flatMap((s) => generateSlots(s))

    const bookedAppointments = await this.appointmentsRepository.findActiveByDoctorAndDate(
      doctorId,
      query.date,
      clinicId,
    )
    const bookedStartTimes = new Set(bookedAppointments.map((a) => a.startTime))

    const exceptions = await this.getActiveExceptionsUseCase.execute(doctorId, clinicId, query.date)

    const freeSlots = allSlots
      .filter((slot) => !bookedStartTimes.has(slot.startTime))
      .filter((slot) => {
        if (exceptions.length === 0) return true
        const slotStart = timeToMinutes(slot.startTime)
        const slotEnd = timeToMinutes(slot.endTime)
        return !exceptions.some((ex) => {
          const blockStart = ex.startTime ? timeToMinutes(ex.startTime) : 0
          const blockEnd = ex.endTime ? timeToMinutes(ex.endTime) : 24 * 60
          return slotStart < blockEnd && slotEnd > blockStart
        })
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const result: AvailabilityResponseDto = {
      doctorId,
      date: query.date,
      slots: freeSlots,
    }

    try {
      await this.cacheService.set(cacheKey, result, 30)
    } catch {
      this.logger.warn('Cache write failed', { context: GetAvailabilityUseCase.name })
    }

    return result
  }
}
