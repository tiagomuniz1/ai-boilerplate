import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentReminder } from '../entities/appointment-reminder.entity'
import { AppointmentRemindersRepository } from './appointment-reminders.repository'

const DB_HOST = process.env.DB_HOST ?? 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT ?? '5499', 10)
const DB_USER = process.env.DB_USER ?? 'postgres'
const DB_PASS = process.env.DB_PASS ?? 'postgres'
const DB_NAME = process.env.DB_NAME ?? 'app'

describe('AppointmentRemindersRepository (integration)', () => {
  let dataSource: DataSource
  let repository: AppointmentRemindersRepository

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      schema: 'test',
      entities: [AppointmentReminder],
      synchronize: false,
    })
    await dataSource.initialize()
    repository = new AppointmentRemindersRepository(dataSource.getRepository(AppointmentReminder))
  })

  afterEach(async () => {
    await dataSource.query('DELETE FROM test.appointment_reminders')
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  describe('claim (send-once via ON CONFLICT)', () => {
    it('claims a reminder slot once and returns the row', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const first = await repository.claim(appointmentId, clinicId, '24h', 'sms', 'pending')
      expect(first).not.toBeNull()
      expect(first!.id).toBeDefined()
      expect(first!.status).toBe('pending')
    })

    it('returns null on a duplicate (appointment, offset) claim', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const first = await repository.claim(appointmentId, clinicId, '24h', 'sms', 'pending')
      const second = await repository.claim(appointmentId, clinicId, '24h', 'sms', 'pending')

      expect(first).not.toBeNull()
      expect(second).toBeNull()
    })

    it('allows the same appointment to be claimed for a different offset', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const at24 = await repository.claim(appointmentId, clinicId, '24h', 'sms', 'pending')
      const at3 = await repository.claim(appointmentId, clinicId, '3h', 'sms', 'pending')

      expect(at24).not.toBeNull()
      expect(at3).not.toBeNull()
    })
  })

  describe('mark*', () => {
    it('finalizes a claimed reminder as sent / failed / skipped', async () => {
      const clinicId = faker.string.uuid()
      const sent = await repository.claim(faker.string.uuid(), clinicId, '24h', 'sms', 'pending')
      const failed = await repository.claim(faker.string.uuid(), clinicId, '24h', 'sms', 'pending')
      const skipped = await repository.claim(faker.string.uuid(), clinicId, '24h', 'sms', 'pending')

      await repository.markSent(sent!.id, 'provider-msg-1')
      await repository.markFailed(failed!.id, 'boom')
      await repository.markSkipped(skipped!.id)

      const rows = await dataSource.getRepository(AppointmentReminder).find()
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
      expect(byId[sent!.id].status).toBe('sent')
      expect(byId[sent!.id].providerMessageId).toBe('provider-msg-1')
      expect(byId[failed!.id].status).toBe('failed')
      expect(byId[failed!.id].error).toBe('boom')
      expect(byId[skipped!.id].status).toBe('skipped')
    })
  })

  describe('findDueCandidates', () => {
    it('executes the join projection and returns an array', async () => {
      const result = await repository.findDueCandidates('2000-01-01', '2000-01-02')
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
