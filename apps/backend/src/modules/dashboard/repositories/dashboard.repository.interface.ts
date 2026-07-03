import { AppointmentStatus } from '@app/shared'

export abstract class IDashboardRepository {
  abstract countByStatus(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<Record<AppointmentStatus, number>>

  abstract getPatientStats(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ total: number; newPatients: number; returning: number; male: number; female: number }>

  abstract getProceduresBySpecialty(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ label: string; value: number }[]>

  abstract getInsuranceStats(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ particular: number; convenio: number }>

  abstract getCidRanking(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ label: string; value: number }[]>

  abstract getCompletedCountByDay(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ date: string; count: number }[]>

  abstract getAgeDistribution(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ age: number; count: number }[]>

  abstract getTodayBirthdays(
    clinicId: string,
    doctorId?: string,
  ): Promise<{ patientId: string; fullName: string; age: number }[]>
}
