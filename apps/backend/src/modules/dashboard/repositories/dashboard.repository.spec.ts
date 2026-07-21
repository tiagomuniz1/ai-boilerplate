import { faker } from '@faker-js/faker'
import { Repository } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { MedicalCertificate } from '../../medical-certificates/entities/medical-certificate.entity'
import { DashboardRepository } from './dashboard.repository'

function makeQb(raw: unknown[] = []) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(raw),
  }
  return qb
}

function makeQrQuery(queryResult: unknown[] = []) {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.startsWith('SET search_path')) return Promise.resolve()
    return Promise.resolve(queryResult)
  })
}

function makeRepo(qb: ReturnType<typeof makeQb>, queryResult: unknown[] = []): Repository<Appointment> {
  const qrQuery = makeQrQuery(queryResult)
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    query: jest.fn().mockResolvedValue(queryResult),
    manager: {
      connection: {
        options: { schema: 'test' },
        createQueryRunner: jest.fn().mockReturnValue({
          connect: jest.fn().mockResolvedValue(undefined),
          query: qrQuery,
          release: jest.fn().mockResolvedValue(undefined),
        }),
      },
    },
    _qrQuery: qrQuery,
  } as unknown as Repository<Appointment>
}

function makeMedCertRepo(qb: ReturnType<typeof makeQb> = makeQb([])): Repository<MedicalCertificate> {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<MedicalCertificate>
}

const CLINIC_ID = 'clinic-uuid'
const FROM = '2026-05-23'
const TO = '2026-06-22'

describe('DashboardRepository', () => {
  describe('countByStatus', () => {
    it('returns zero counts when no rows', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.countByStatus(CLINIC_ID, FROM, TO)

      expect(result[AppointmentStatus.COMPLETED]).toBe(0)
      expect(result[AppointmentStatus.SCHEDULED]).toBe(0)
    })

    it('maps rows to status counts', async () => {
      const qb = makeQb([
        { status: 'completed', count: '5' },
        { status: 'scheduled', count: '3' },
      ])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.countByStatus(CLINIC_ID, FROM, TO)

      expect(result[AppointmentStatus.COMPLETED]).toBe(5)
      expect(result[AppointmentStatus.SCHEDULED]).toBe(3)
    })

    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      await repo.countByStatus(CLINIC_ID, FROM, TO, 'doctor-id')

      expect(qb.andWhere).toHaveBeenCalledWith('a.professional_id = :professionalId', { professionalId: 'doctor-id' })
    })
  })

  describe('getProceduresBySpecialty', () => {
    it('returns mapped procedures', async () => {
      const qb = makeQb([
        { label: 'Cardiologia', value: '7' },
        { label: 'Sem especialidade', value: '2' },
      ])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.getProceduresBySpecialty(CLINIC_ID, FROM, TO)

      expect(result).toEqual([
        { label: 'Cardiologia', value: 7 },
        { label: 'Sem especialidade', value: 2 },
      ])
    })
  })

  describe('getInsuranceStats', () => {
    it('returns particular and convenio counts', async () => {
      const qb = makeQb([
        { insuranceType: 'particular', count: '4' },
        { insuranceType: 'convenio', count: '2' },
      ])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.getInsuranceStats(CLINIC_ID, FROM, TO)

      expect(result).toEqual({ particular: 4, convenio: 2 })
    })

    it('returns zeros when no rows', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.getInsuranceStats(CLINIC_ID, FROM, TO)

      expect(result).toEqual({ particular: 0, convenio: 0 })
    })
  })

  describe('getCidRanking', () => {
    it('returns mapped CID ranking ordered by value', async () => {
      const qb = makeQb([
        { label: 'M54.5', value: '7' },
        { label: 'J11', value: '2' },
      ])
      const repo = new DashboardRepository(makeRepo(makeQb([])), makeMedCertRepo(qb))
      const result = await repo.getCidRanking(CLINIC_ID, FROM, TO)

      expect(result).toEqual([
        { label: 'M54.5', value: 7 },
        { label: 'J11', value: 2 },
      ])
    })

    it('returns empty array when no certificates', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(makeQb([])), makeMedCertRepo(qb))
      const result = await repo.getCidRanking(CLINIC_ID, FROM, TO)

      expect(result).toEqual([])
    })

    it('filters by type=leave, non-null cidCode, and limits to top 10', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(makeQb([])), makeMedCertRepo(qb))
      await repo.getCidRanking(CLINIC_ID, FROM, TO)

      expect(qb.andWhere).toHaveBeenCalledWith("mc.snapshot->>'type' = 'leave'")
      expect(qb.andWhere).toHaveBeenCalledWith("mc.snapshot->>'cidCode' IS NOT NULL")
      expect(qb.limit).toHaveBeenCalledWith(10)
    })

    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(makeQb([])), makeMedCertRepo(qb))
      await repo.getCidRanking(CLINIC_ID, FROM, TO, 'doc-id')

      expect(qb.andWhere).toHaveBeenCalledWith('mc.professional_id = :professionalId', { professionalId: 'doc-id' })
    })

    it('does not apply professionalId filter when not provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(makeQb([])), makeMedCertRepo(qb))
      await repo.getCidRanking(CLINIC_ID, FROM, TO)

      expect(qb.andWhere).not.toHaveBeenCalledWith('mc.professional_id = :professionalId', expect.anything())
    })
  })

  describe('getCompletedCountByDay', () => {
    it('maps rows correctly', async () => {
      const qb = makeQb([
        { date: '2026-06-20', count: '2' },
        { date: '2026-06-22', count: '1' },
      ])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.getCompletedCountByDay(CLINIC_ID, FROM, TO)

      expect(result).toEqual([
        { date: '2026-06-20', count: 2 },
        { date: '2026-06-22', count: 1 },
      ])
    })
  })

  describe('getAgeDistribution', () => {
    it('maps age and count rows', async () => {
      const qb = makeQb([
        { age: '30', count: '3' },
        { age: '45', count: '1' },
      ])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      const result = await repo.getAgeDistribution(CLINIC_ID, FROM, TO)

      expect(result).toEqual([
        { age: 30, count: 3 },
        { age: 45, count: 1 },
      ])
    })
  })

  describe('getTodayBirthdays', () => {
    it('maps birthday rows with age', async () => {
      const patientId = faker.string.uuid()
      const qb = makeQb([])
      const repo = makeRepo(qb, [{ patientId, fullName: 'João Silva', age: '35' }])
      const result = await new DashboardRepository(repo, makeMedCertRepo()).getTodayBirthdays(CLINIC_ID)

      expect(result).toEqual([{ patientId, fullName: 'João Silva', age: 35 }])
    })

    it('uses QueryRunner without professionalId (queries patients directly)', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [])
      await new DashboardRepository(repo, makeMedCertRepo()).getTodayBirthdays(CLINIC_ID)
      const qrQuery = (repo as any)._qrQuery as jest.Mock
      const dataCalls = qrQuery.mock.calls.filter(([sql]: [string]) => !sql.startsWith('SET search_path'))
      expect(dataCalls.length).toBe(1)
      const [sql, params] = dataCalls[0]
      expect(sql).toContain('FROM patients p')
      expect(sql).not.toContain('EXISTS')
      expect(params).toEqual([CLINIC_ID])
    })

    it('adds EXISTS filter with professionalId when provided', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [])
      await new DashboardRepository(repo, makeMedCertRepo()).getTodayBirthdays(CLINIC_ID, 'doc-id')
      const qrQuery = (repo as any)._qrQuery as jest.Mock
      const dataCalls = qrQuery.mock.calls.filter(([sql]: [string]) => !sql.startsWith('SET search_path'))
      expect(dataCalls.length).toBe(1)
      const [sql, params] = dataCalls[0]
      expect(sql).toContain('EXISTS')
      expect(sql).toContain('a.professional_id = $2')
      expect(params).toEqual([CLINIC_ID, 'doc-id'])
    })

    it('maps rows correctly when professionalId is provided and rows are returned', async () => {
      const patientId = faker.string.uuid()
      const qb = makeQb([])
      const repo = makeRepo(qb, [{ patientId, fullName: 'Maria Costa', age: '28' }])

      const result = await new DashboardRepository(repo, makeMedCertRepo()).getTodayBirthdays(CLINIC_ID, 'doc-id')

      expect(result).toEqual([{ patientId, fullName: 'Maria Costa', age: 28 }])
    })
  })

  describe('getProceduresBySpecialty', () => {
    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      await repo.getProceduresBySpecialty(CLINIC_ID, FROM, TO, 'doc-id')

      expect(qb.andWhere).toHaveBeenCalledWith('a.professional_id = :professionalId', { professionalId: 'doc-id' })
    })
  })

  describe('getInsuranceStats', () => {
    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      await repo.getInsuranceStats(CLINIC_ID, FROM, TO, 'doc-id')

      expect(qb.andWhere).toHaveBeenCalledWith('a.professional_id = :professionalId', { professionalId: 'doc-id' })
    })
  })

  describe('getCompletedCountByDay', () => {
    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      await repo.getCompletedCountByDay(CLINIC_ID, FROM, TO, 'doc-id')

      expect(qb.andWhere).toHaveBeenCalledWith('a.professional_id = :professionalId', { professionalId: 'doc-id' })
    })
  })

  describe('getAgeDistribution', () => {
    it('applies professionalId filter when provided', async () => {
      const qb = makeQb([])
      const repo = new DashboardRepository(makeRepo(qb), makeMedCertRepo())
      await repo.getAgeDistribution(CLINIC_ID, FROM, TO, 'doc-id')

      expect(qb.andWhere).toHaveBeenCalledWith('a.professional_id = :professionalId', { professionalId: 'doc-id' })
    })
  })

  describe('getPatientStats', () => {
    it('returns zeros when no patients in period', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [])
      const result = await new DashboardRepository(repo, makeMedCertRepo()).getPatientStats(CLINIC_ID, FROM, TO)
      expect(result).toEqual({ total: 0, newPatients: 0, returning: 0, male: 0, female: 0 })
    })

    it('classifies new vs returning patients correctly', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [
        { gender: 'male', patient_type: 'new' },
        { gender: 'female', patient_type: 'returning' },
      ])
      const result = await new DashboardRepository(repo, makeMedCertRepo()).getPatientStats(CLINIC_ID, FROM, TO)
      expect(result.total).toBe(2)
      expect(result.newPatients).toBe(1)
      expect(result.returning).toBe(1)
      expect(result.male).toBe(1)
      expect(result.female).toBe(1)
    })

    it('applies professionalId filter in SQL when provided', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [])
      await new DashboardRepository(repo, makeMedCertRepo()).getPatientStats(CLINIC_ID, FROM, TO, 'doc-id')
      const qrQuery = (repo as any)._qrQuery as jest.Mock
      const dataCalls = qrQuery.mock.calls.filter(([sql]: [string]) => !sql.startsWith('SET search_path'))
      const [sql, params] = dataCalls[0]
      expect(sql).toContain('a.professional_id = $4')
      expect(params).toContain('doc-id')
    })

    it('does not include professionalId filter when not provided', async () => {
      const qb = makeQb([])
      const repo = makeRepo(qb, [])
      await new DashboardRepository(repo, makeMedCertRepo()).getPatientStats(CLINIC_ID, FROM, TO)
      const qrQuery = (repo as any)._qrQuery as jest.Mock
      const dataCalls = qrQuery.mock.calls.filter(([sql]: [string]) => !sql.startsWith('SET search_path'))
      const [sql, params] = dataCalls[0]
      expect(sql).not.toContain('professional_id')
      expect(params).toHaveLength(3)
    })

    it('falls back to public schema when options.schema is not set (getPatientStats)', async () => {
      const qb = makeQb([])
      const qrQuery = makeQrQuery([])
      const repoWithoutSchema = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        query: jest.fn().mockResolvedValue([]),
        manager: {
          connection: {
            options: {},
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn().mockResolvedValue(undefined),
              query: qrQuery,
              release: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        _qrQuery: qrQuery,
      } as unknown as Repository<Appointment>

      await new DashboardRepository(repoWithoutSchema, makeMedCertRepo()).getPatientStats(CLINIC_ID, FROM, TO)

      const setPaths = qrQuery.mock.calls.filter(([sql]: [string]) => sql.startsWith('SET search_path'))
      expect(setPaths[0][0]).toContain('"public"')
    })
  })

  describe('getTodayBirthdays — schema fallback', () => {
    it('falls back to public schema when options.schema is not set', async () => {
      const qb = makeQb([])
      const qrQuery = makeQrQuery([])
      const repoWithoutSchema = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        query: jest.fn().mockResolvedValue([]),
        manager: {
          connection: {
            options: {},
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn().mockResolvedValue(undefined),
              query: qrQuery,
              release: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        _qrQuery: qrQuery,
      } as unknown as Repository<Appointment>

      await new DashboardRepository(repoWithoutSchema, makeMedCertRepo()).getTodayBirthdays(CLINIC_ID)

      const setPaths = qrQuery.mock.calls.filter(([sql]: [string]) => sql.startsWith('SET search_path'))
      expect(setPaths[0][0]).toContain('"public"')
    })
  })
})
