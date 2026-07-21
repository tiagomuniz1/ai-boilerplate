import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { MedicalCertificate } from '../../medical-certificates/entities/medical-certificate.entity'
import { IDashboardRepository } from './dashboard.repository.interface'

@Injectable()
export class DashboardRepository implements IDashboardRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(MedicalCertificate)
    private readonly medicalCertificateRepository: Repository<MedicalCertificate>,
  ) {}

  async countByStatus(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
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

    if (professionalId) qb.andWhere('a.professional_id = :professionalId', { professionalId })

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
    professionalId?: string,
  ): Promise<{ total: number; newPatients: number; returning: number; male: number; female: number }> {
    // Single CTE query to avoid passing large patient ID arrays as bind parameters.
    // period_patients: distinct patients with a non-cancelled appointment in the period.
    // first_appts: earliest appointment date per patient across the whole clinic history.
    // Result classifies each patient as new (first appointment falls within period) or returning.
    const params: unknown[] = [clinicId, from, to]
    let professionalFilter = ''
    if (professionalId) {
      params.push(professionalId)
      professionalFilter = `AND a.professional_id = $${params.length}`
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
          ${professionalFilter}
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
    professionalId?: string,
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

    if (professionalId) qb.andWhere('a.professional_id = :professionalId', { professionalId })

    const rows: Array<{ label: string; value: string }> = await qb.getRawMany()
    return rows.map((r) => ({ label: r.label, value: parseInt(r.value, 10) }))
  }

  async getInsuranceStats(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
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

    if (professionalId) qb.andWhere('a.professional_id = :professionalId', { professionalId })

    const rows: Array<{ insuranceType: string; count: string }> = await qb.getRawMany()

    let particular = 0
    let convenio = 0
    for (const row of rows) {
      if (row.insuranceType === 'particular') particular = parseInt(row.count, 10)
      else if (row.insuranceType === 'convenio') convenio = parseInt(row.count, 10)
    }

    return { particular, convenio }
  }

  async getCidRanking(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
  ): Promise<{ label: string; value: number }[]> {
    const qb = this.medicalCertificateRepository
      .createQueryBuilder('mc')
      .select("mc.snapshot->>'cidCode'", 'label')
      .addSelect('COUNT(*)', 'value')
      .where('mc.clinic_id = :clinicId', { clinicId })
      .andWhere('mc.issued_at::date >= :from', { from })
      .andWhere('mc.issued_at::date <= :to', { to })
      .andWhere("mc.snapshot->>'type' = 'leave'")
      .andWhere("mc.snapshot->>'cidCode' IS NOT NULL")
      .andWhere('mc.deleted_at IS NULL')
      .groupBy("mc.snapshot->>'cidCode'")
      .orderBy('value', 'DESC')
      .limit(10)

    if (professionalId) qb.andWhere('mc.professional_id = :professionalId', { professionalId })

    const rows: Array<{ label: string; value: string }> = await qb.getRawMany()
    return rows.map((r) => ({ label: r.label, value: parseInt(r.value, 10) }))
  }

  async getCompletedCountByDay(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
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

    if (professionalId) qb.andWhere('a.professional_id = :professionalId', { professionalId })

    const rows: Array<{ date: string; count: string }> = await qb.getRawMany()
    return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }))
  }

  async getAgeDistribution(
    clinicId: string,
    from: string,
    to: string,
    professionalId?: string,
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

    if (professionalId) qb.andWhere('a.professional_id = :professionalId', { professionalId })

    const rows: Array<{ age: string; count: string }> = await qb.getRawMany()
    return rows.map((r) => ({ age: parseInt(r.age, 10), count: parseInt(r.count, 10) }))
  }

  async getTodayBirthdays(
    clinicId: string,
    professionalId?: string,
  ): Promise<{ patientId: string; fullName: string; age: number }[]> {
    // Query patients directly using the expression index on (month, day) of birth_date.
    // When professionalId is provided, restrict to patients of that doctor via appointments.
    const connection = this.appointmentRepository.manager.connection
    const schema = (connection.options as any).schema ?? 'public'
    const qr = connection.createQueryRunner()
    await qr.connect()
    try {
      await qr.query(`SET search_path TO "${schema}", public`)

      if (!professionalId) {
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

      // With professionalId filter: join appointments to restrict to that doctor's patients.
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
                 AND a.professional_id = $2 AND a.deleted_at IS NULL
             )
           ORDER BY u.full_name`,
          [clinicId, professionalId],
        )
      return rows.map((r) => ({ patientId: r.patientId, fullName: r.fullName, age: parseInt(r.age, 10) }))
    } finally {
      await qr.release()
    }
  }
}
