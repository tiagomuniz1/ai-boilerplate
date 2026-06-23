import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { IDashboardRepository } from './dashboard.repository.interface'

@Injectable()
export class DashboardRepository implements IDashboardRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async countByStatus(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<Record<AppointmentStatus, number>> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.clinic_id = :clinicId', { clinicId })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .andWhere('a.deleted_at IS NULL')
      .groupBy('a.status')

    if (doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const rows: Array<{ status: string; count: string }> = await qb.getRawMany()

    const result = {
      [AppointmentStatus.SCHEDULED]: 0,
      [AppointmentStatus.CONFIRMED]: 0,
      [AppointmentStatus.COMPLETED]: 0,
      [AppointmentStatus.CANCELLED]: 0,
      [AppointmentStatus.NO_SHOW]: 0,
    } as Record<AppointmentStatus, number>

    for (const row of rows) {
      result[row.status as AppointmentStatus] = parseInt(row.count, 10)
    }

    return result
  }

  async getPatientStats(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ total: number; newPatients: number; returning: number; male: number; female: number }> {
    // Single CTE query to avoid passing large patient ID arrays as bind parameters.
    // period_patients: distinct patients with a non-cancelled appointment in the period.
    // first_appts: earliest appointment date per patient across the whole clinic history.
    // Result classifies each patient as new (first appointment falls within period) or returning.
    const params: unknown[] = [clinicId, from, to]
    let doctorFilter = ''
    if (doctorId) {
      params.push(doctorId)
      doctorFilter = `AND a.doctor_id = $${params.length}`
    }

    const sql = `
      WITH period_patients AS (
        SELECT a.patient_id, p.gender
        FROM appointments a
        INNER JOIN patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
        WHERE a.clinic_id = $1
          AND a.date >= $2
          AND a.date <= $3
          AND a.status != 'cancelled'
          AND a.deleted_at IS NULL
          ${doctorFilter}
        GROUP BY a.patient_id, p.gender
      ),
      first_appts AS (
        SELECT a.patient_id, MIN(a.date) AS first_date
        FROM appointments a
        INNER JOIN period_patients pp ON pp.patient_id = a.patient_id
        WHERE a.clinic_id = $1
          AND a.status != 'cancelled'
          AND a.deleted_at IS NULL
        GROUP BY a.patient_id
      )
      SELECT
        pp.gender,
        CASE WHEN fa.first_date >= $2 AND fa.first_date <= $3 THEN 'new' ELSE 'returning' END AS patient_type
      FROM period_patients pp
      JOIN first_appts fa ON fa.patient_id = pp.patient_id
    `

    const connection = this.appointmentRepository.manager.connection
    const schema = (connection.options as any).schema ?? 'public'
    const qr = connection.createQueryRunner()
    await qr.connect()
    let rows: Array<{ gender: string; patient_type: string }> = []
    try {
      await qr.query(`SET search_path TO "${schema}", public`)
      rows = await qr.query(sql, params)
    } finally {
      await qr.release()
    }

    let newPatients = 0
    let returning = 0
    let male = 0
    let female = 0

    for (const row of rows) {
      if (row.patient_type === 'new') newPatients++
      else returning++
      if (row.gender === 'male') male++
      else if (row.gender === 'female') female++
    }

    return { total: newPatients + returning, newPatients, returning, male, female }
  }

  async getProceduresBySpecialty(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ label: string; value: number }[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoin('specialties', 's', 's.id = a.specialty_id AND s.deleted_at IS NULL')
      .select("COALESCE(s.name, 'Sem especialidade')", 'label')
      .addSelect('COUNT(*)', 'value')
      .where('a.clinic_id = :clinicId', { clinicId })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .andWhere("a.status = 'completed'")
      .andWhere('a.deleted_at IS NULL')
      .groupBy("COALESCE(s.name, 'Sem especialidade')")
      .orderBy('value', 'DESC')

    if (doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const rows: Array<{ label: string; value: string }> = await qb.getRawMany()
    return rows.map((r) => ({ label: r.label, value: parseInt(r.value, 10) }))
  }

  async getInsuranceStats(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ particular: number; convenio: number }> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .select('a.insurance_type', 'insuranceType')
      .addSelect('COUNT(*)', 'count')
      .where('a.clinic_id = :clinicId', { clinicId })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .andWhere('a.insurance_type IS NOT NULL')
      .andWhere('a.deleted_at IS NULL')
      .groupBy('a.insurance_type')

    if (doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const rows: Array<{ insuranceType: string; count: string }> = await qb.getRawMany()

    let particular = 0
    let convenio = 0
    for (const row of rows) {
      if (row.insuranceType === 'particular') particular = parseInt(row.count, 10)
      else if (row.insuranceType === 'convenio') convenio = parseInt(row.count, 10)
    }

    return { particular, convenio }
  }

  async getDurationStats(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ averageMinutes: number; particular: number; convenio: number }> {
    const baseQb = () =>
      this.appointmentRepository
        .createQueryBuilder('a')
        .where('a.clinic_id = :clinicId', { clinicId })
        .andWhere('a.date >= :from', { from })
        .andWhere('a.date <= :to', { to })
        .andWhere("a.status = 'completed'")
        .andWhere('a.deleted_at IS NULL')

    const avgQb = baseQb()
      .select(
        "AVG(EXTRACT(EPOCH FROM (TO_TIMESTAMP(a.end_time, 'HH24:MI') - TO_TIMESTAMP(a.start_time, 'HH24:MI'))) / 60)",
        'avgMinutes',
      )

    if (doctorId) avgQb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const insQb = baseQb()
      .select('a.insurance_type', 'insuranceType')
      .addSelect('COUNT(*)', 'count')
      .andWhere('a.insurance_type IS NOT NULL')
      .groupBy('a.insurance_type')

    if (doctorId) insQb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const [avgRow, insRows]: [
      Array<{ avgMinutes: string | null }>,
      Array<{ insuranceType: string; count: string }>,
    ] = await Promise.all([avgQb.getRawMany(), insQb.getRawMany()])

    const averageMinutes = avgRow[0]?.avgMinutes ? Math.round(parseFloat(avgRow[0].avgMinutes)) : 0

    let particular = 0
    let convenio = 0
    for (const row of insRows) {
      if (row.insuranceType === 'particular') particular = parseInt(row.count, 10)
      else if (row.insuranceType === 'convenio') convenio = parseInt(row.count, 10)
    }

    return { averageMinutes, particular, convenio }
  }

  async getCompletedCountByDay(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ date: string; count: number }[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .select("TO_CHAR(a.date, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('a.clinic_id = :clinicId', { clinicId })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .andWhere("a.status = 'completed'")
      .andWhere('a.deleted_at IS NULL')
      .groupBy('a.date')
      .orderBy('a.date', 'ASC')

    if (doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const rows: Array<{ date: string; count: string }> = await qb.getRawMany()
    return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }))
  }

  async getAgeDistribution(
    clinicId: string,
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<{ age: number; count: number }[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .innerJoin('patients', 'p', 'p.id = a.patient_id AND p.deleted_at IS NULL')
      .select("DATE_PART('year', AGE(p.birth_date::date))", 'age')
      .addSelect('COUNT(DISTINCT a.patient_id)', 'count')
      .where('a.clinic_id = :clinicId', { clinicId })
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date <= :to', { to })
      .andWhere("a.status = 'completed'")
      .andWhere('a.deleted_at IS NULL')
      .groupBy("DATE_PART('year', AGE(p.birth_date::date))")
      .orderBy('age', 'ASC')

    if (doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId })

    const rows: Array<{ age: string; count: string }> = await qb.getRawMany()
    return rows.map((r) => ({ age: parseInt(r.age, 10), count: parseInt(r.count, 10) }))
  }

  async getTodayBirthdays(
    clinicId: string,
    doctorId?: string,
  ): Promise<{ patientId: string; fullName: string; age: number }[]> {
    // Query patients directly using the expression index on (month, day) of birth_date.
    // When doctorId is provided, restrict to patients of that doctor via appointments.
    const connection = this.appointmentRepository.manager.connection
    const schema = (connection.options as any).schema ?? 'public'
    const qr = connection.createQueryRunner()
    await qr.connect()
    try {
      await qr.query(`SET search_path TO "${schema}", public`)

      if (!doctorId) {
        const rows: Array<{ patientId: string; fullName: string; age: string }> =
          await qr.query(
            `SELECT p.id AS "patientId", u.full_name AS "fullName",
                    DATE_PART('year', AGE(CAST(p.birth_date AS date))) AS age
             FROM patients p
             INNER JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
             WHERE p.clinic_id = $1
               AND p.deleted_at IS NULL
               AND date_part('month', CAST(p.birth_date AS date)) = date_part('month', CURRENT_DATE)
               AND date_part('day',   CAST(p.birth_date AS date)) = date_part('day',   CURRENT_DATE)
             ORDER BY u.full_name`,
            [clinicId],
          )
        return rows.map((r) => ({ patientId: r.patientId, fullName: r.fullName, age: parseInt(r.age, 10) }))
      }

      // With doctorId filter: join appointments to restrict to that doctor's patients.
      const rows: Array<{ patientId: string; fullName: string; age: string }> =
        await qr.query(
          `SELECT p.id AS "patientId", u.full_name AS "fullName",
                  DATE_PART('year', AGE(CAST(p.birth_date AS date))) AS age
           FROM patients p
           INNER JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
           WHERE p.clinic_id = $1
             AND p.deleted_at IS NULL
             AND date_part('month', CAST(p.birth_date AS date)) = date_part('month', CURRENT_DATE)
             AND date_part('day',   CAST(p.birth_date AS date)) = date_part('day',   CURRENT_DATE)
             AND EXISTS (
               SELECT 1 FROM appointments a
               WHERE a.patient_id = p.id AND a.clinic_id = $1
                 AND a.doctor_id = $2 AND a.deleted_at IS NULL
             )
           ORDER BY u.full_name`,
          [clinicId, doctorId],
        )
      return rows.map((r) => ({ patientId: r.patientId, fullName: r.fullName, age: parseInt(r.age, 10) }))
    } finally {
      await qr.release()
    }
  }
}
