import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

export interface IConflictingAppointment {
  id: string
  startTime: string
  endTime: string
  patientName: string
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

@Injectable()
export class FindScheduledAppointmentsInWindowUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
  ) {
    super(dataSource)
  }

  async execute(
    professionalId: string,
    date: string,
    startTime: string | null,
    endTime: string | null,
    clinicId: string,
  ): Promise<IConflictingAppointment[]> {
    const appointments = await this.appointmentsRepository.findActiveByProfessionalAndDate(professionalId, date, clinicId)

    const blockStart = startTime ? timeToMinutes(startTime) : 0
    const blockEnd = endTime ? timeToMinutes(endTime) : 24 * 60

    const conflicting = appointments.filter((appt) => {
      if (appt.status !== AppointmentStatus.SCHEDULED) return false
      const slotStart = timeToMinutes(appt.startTime)
      const slotEnd = timeToMinutes(appt.endTime)
      return slotStart < blockEnd && slotEnd > blockStart
    })

    if (conflicting.length === 0) return []

    const ids = conflicting.map((a) => a.id)
    const rows: Array<{ apptId: string; patientName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('a.id', 'apptId')
      .addSelect('u.full_name', 'patientName')
      .from('appointments', 'a')
      .innerJoin('patients', 'p', 'p.id = a.patient_id AND p.deleted_at IS NULL')
      .innerJoin('users', 'u', 'u.id = p.user_id AND u.deleted_at IS NULL')
      .where('a.id IN (:...ids)', { ids })
      .andWhere('a.deleted_at IS NULL')
      .getRawMany()

    const nameMap = new Map(rows.map((r) => [r.apptId, r.patientName]))

    return conflicting.map((appt) => ({
      id: appt.id,
      startTime: appt.startTime,
      endTime: appt.endTime,
      patientName: nameMap.get(appt.id) ?? '',
    }))
  }
}
