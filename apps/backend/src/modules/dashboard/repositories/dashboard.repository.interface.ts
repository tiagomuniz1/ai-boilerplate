import { AppointmentStatus } from '@app/shared'

export abstract class IDashboardRepository {
  abstract countByStatus(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<Record<AppointmentStatus, number>>

  abstract getPatientStats(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ total: number; newPatients: number; returning: number; male: number; female: number }>

  abstract getProceduresBySpecialty(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ label: string; value: number }[]>

  abstract getInsuranceStats(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ particular: number; convenio: number }>

  abstract getCidRanking(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ label: string; value: number }[]>

  abstract getCompletedCountByDay(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ date: string; count: number }[]>

  abstract getAgeDistribution(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ age: number; count: number }[]>

  abstract getTodayBirthdays(
    clinicId: string,
    professionalId?: string,
  ): Promise<{ patientId: string; fullName: string; age: number }[]>
}
