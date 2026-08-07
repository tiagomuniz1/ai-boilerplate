import { Repository } from 'typeorm'
import { AppointmentReminder } from '../entities/appointment-reminder.entity'
import { AppointmentRemindersRepository } from './appointment-reminders.repository'

function makeInsertBuilder(rawRows: any[]) {
  const builder: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: rawRows }),
  }
  return builder
}

function makeRepo(): jest.Mocked<Repository<AppointmentReminder>> {
  return {
    create: jest.fn().mockImplementation((v) => v),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { query: jest.fn(), connection: { options: { schema: 'test' } } },
  } as unknown as jest.Mocked<Repository<AppointmentReminder>>
}

describe('AppointmentRemindersRepository', () => {
  let repo: jest.Mocked<Repository<AppointmentReminder>>
  let repository: AppointmentRemindersRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new AppointmentRemindersRepository(repo)
  })

  describe('findDueCandidates', () => {
    it('runs a schema-qualified projection query with the date range params', async () => {
      const rows = [
        {
          appointmentId: 'a1',
          clinicId: 'c1',
          clinicName: 'Clínica',
          date: '2026-08-20',
          startTime: '14:00',
          patientName: 'Maria',
          patientPhone: '11999999999',
          professionalName: 'Dr. Ana',
        },
      ]
      ;(repo.manager.query as jest.Mock).mockResolvedValue(rows)

      const result = await repository.findDueCandidates('2026-08-20', '2026-08-22')

      expect(result).toEqual(rows)
      const [sql, params] = (repo.manager.query as jest.Mock).mock.calls[0]
      expect(sql).toContain('test.appointments a')
      expect(sql).toContain("a.status IN ('scheduled', 'confirmed')")
      expect(params).toEqual(['2026-08-20', '2026-08-22'])
    })

    it('falls back to the public schema when the configured schema is unsafe', async () => {
      ;(repo.manager as any).connection.options.schema = 'bad;drop'
      ;(repo.manager.query as jest.Mock).mockResolvedValue([])

      await repository.findDueCandidates('2026-08-20', '2026-08-22')

      const [sql] = (repo.manager.query as jest.Mock).mock.calls[0]
      expect(sql).toContain('public.appointments a')
    })

    it('falls back to the public schema when no schema is configured', async () => {
      ;(repo.manager as any).connection = undefined
      ;(repo.manager.query as jest.Mock).mockResolvedValue([])

      await repository.findDueCandidates('2026-08-20', '2026-08-22')

      const [sql] = (repo.manager.query as jest.Mock).mock.calls[0]
      expect(sql).toContain('public.appointments a')
    })
  })

  describe('claim', () => {
    it('returns the created row when the insert succeeds', async () => {
      const builder = makeInsertBuilder([{ id: 'r1', created_at: new Date(), updated_at: new Date() }])
      ;(repo.createQueryBuilder as jest.Mock).mockReturnValue(builder)

      const result = await repository.claim('a1', 'c1', '24h', 'sms', 'pending')

      expect(builder.orIgnore).toHaveBeenCalled()
      expect(result).toMatchObject({ id: 'r1', appointmentId: 'a1', offsetLabel: '24h', status: 'pending' })
    })

    it('returns null when the row already exists (conflict → no raw row)', async () => {
      const builder = makeInsertBuilder([])
      ;(repo.createQueryBuilder as jest.Mock).mockReturnValue(builder)

      expect(await repository.claim('a1', 'c1', '24h', 'sms', 'pending')).toBeNull()
    })
  })

  describe('mark*', () => {
    it('markSent sets status sent + provider message id', async () => {
      await repository.markSent('r1', 'msg-1')
      expect(repo.update).toHaveBeenCalledWith('r1', { status: 'sent', providerMessageId: 'msg-1' })
    })

    it('markFailed sets status failed and truncates the error to 500 chars', async () => {
      const longError = 'x'.repeat(600)
      await repository.markFailed('r1', longError)
      expect(repo.update).toHaveBeenCalledWith('r1', { status: 'failed', error: 'x'.repeat(500) })
    })

    it('markSkipped sets status skipped', async () => {
      await repository.markSkipped('r1')
      expect(repo.update).toHaveBeenCalledWith('r1', { status: 'skipped' })
    })
  })
})
