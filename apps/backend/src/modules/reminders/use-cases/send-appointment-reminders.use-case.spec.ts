jest.mock('../../../config/env.config')

import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { getEnvConfig } from '../../../config/env.config'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ISmsAdapter } from '../adapters/sms.adapter.interface'
import { IAppointmentRemindersRepository } from '../repositories/appointment-reminders.repository.interface'
import { SendAppointmentRemindersUseCase } from './send-appointment-reminders.use-case'

const mockGetEnvConfig = getEnvConfig as jest.Mock

const HOUR = 60 * 60 * 1000
const appointmentAt = new Date('2026-08-20T14:00:00-03:00')

const makeCandidate = (overrides = {}) => ({
  appointmentId: 'appt-1',
  clinicId: 'clinic-1',
  clinicName: 'Clínica X',
  date: '2026-08-20',
  startTime: '14:00',
  patientName: 'Maria Silva Souza',
  patientPhone: '11998877665',
  professionalName: 'Dr. Ana',
  ...overrides,
})

// now that lands 1 minute into the reminder window for a given offset (hours).
const dueNow = (offsetHours: number) => new Date(appointmentAt.getTime() - offsetHours * HOUR + 60 * 1000)

const mockRepo: jest.Mocked<IAppointmentRemindersRepository> = {
  findDueCandidates: jest.fn(),
  claim: jest.fn(),
  markSent: jest.fn(),
  markFailed: jest.fn(),
  release: jest.fn(),
}

const mockSmsAdapter: jest.Mocked<ISmsAdapter> = {
  sendSms: jest.fn(),
}

const mockLock = {
  runWithLock: jest.fn().mockImplementation((_key: string, _ttl: number, op: () => Promise<unknown>) => op()),
} as unknown as jest.Mocked<DistributedLockService>

describe('SendAppointmentRemindersUseCase', () => {
  let useCase: SendAppointmentRemindersUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SendAppointmentRemindersUseCase({} as DataSource, mockRepo, mockSmsAdapter, mockLock)
    mockGetEnvConfig.mockReturnValue({ REMINDER_OFFSETS_HOURS: undefined })
    mockRepo.findDueCandidates.mockResolvedValue([makeCandidate()])
    mockRepo.claim.mockResolvedValue({ id: 'reminder-1' } as any)
    mockSmsAdapter.sendSms.mockResolvedValue({ status: 'sent', providerMessageId: 'provider-msg-1' })
    mockLock.runWithLock.mockImplementation((_k: any, _t: any, op: any) => op())
  })

  it('no-ops when a peer instance holds the tick lock', async () => {
    mockLock.runWithLock.mockRejectedValue(new ConflictException('locked'))
    await expect(useCase.execute(dueNow(24))).resolves.toBeUndefined()
    expect(mockRepo.findDueCandidates).not.toHaveBeenCalled()
  })

  it('swallows unexpected tick errors without throwing', async () => {
    mockLock.runWithLock.mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(dueNow(24))).resolves.toBeUndefined()
  })

  it('swallows a non-Error tick rejection', async () => {
    mockLock.runWithLock.mockRejectedValue('boom-string')
    await expect(useCase.execute(dueNow(24))).resolves.toBeUndefined()
  })

  it('defaults now to the current time when called with no argument', async () => {
    mockRepo.findDueCandidates.mockResolvedValue([])
    await expect(useCase.execute()).resolves.toBeUndefined()
    expect(mockRepo.findDueCandidates).toHaveBeenCalled()
  })

  it('sends the 24h reminder: claims pending, sends SMS, marks sent', async () => {
    await useCase.execute(dueNow(24))

    expect(mockRepo.claim).toHaveBeenCalledWith('appt-1', 'clinic-1', '24h', 'sms', 'pending')
    expect(mockSmsAdapter.sendSms).toHaveBeenCalledTimes(1)
    const arg = mockSmsAdapter.sendSms.mock.calls[0][0]
    expect(arg.toE164).toBe('+5511998877665')
    expect(arg.body).toContain('Maria')
    expect(arg.body).toContain('Dr. Ana')
    expect(arg.body).toContain('Clínica X')
    expect(arg.body).toContain('20/08')
    expect(arg.body).toContain('14:00')
    expect(mockRepo.markSent).toHaveBeenCalledWith('reminder-1', 'provider-msg-1')
  })

  it('sends the 3h reminder in its own window', async () => {
    await useCase.execute(dueNow(3))
    expect(mockRepo.claim).toHaveBeenCalledWith('appt-1', 'clinic-1', '3h', 'sms', 'pending')
    expect(mockSmsAdapter.sendSms).toHaveBeenCalledTimes(1)
  })

  it('does not send when now is outside every offset window', async () => {
    await useCase.execute(new Date(appointmentAt.getTime() - 12 * HOUR))
    expect(mockRepo.claim).not.toHaveBeenCalled()
    expect(mockSmsAdapter.sendSms).not.toHaveBeenCalled()
  })

  it('does not send for an appointment already in the past', async () => {
    await useCase.execute(new Date(appointmentAt.getTime() + HOUR))
    expect(mockRepo.claim).not.toHaveBeenCalled()
  })

  it('does not send when the slot was already claimed (claim returns null)', async () => {
    mockRepo.claim.mockResolvedValue(null)
    await useCase.execute(dueNow(24))
    expect(mockSmsAdapter.sendSms).not.toHaveBeenCalled()
  })

  it('skips (records skipped) when the patient phone is invalid', async () => {
    mockRepo.findDueCandidates.mockResolvedValue([makeCandidate({ patientPhone: 'not-a-phone' })])
    await useCase.execute(dueNow(24))
    expect(mockRepo.claim).toHaveBeenCalledWith('appt-1', 'clinic-1', '24h', 'sms', 'skipped')
    expect(mockSmsAdapter.sendSms).not.toHaveBeenCalled()
  })

  it('marks failed (and does not crash) when the SMS adapter throws', async () => {
    mockSmsAdapter.sendSms.mockRejectedValue(new Error('throttled'))
    await expect(useCase.execute(dueNow(24))).resolves.toBeUndefined()
    expect(mockRepo.markFailed).toHaveBeenCalledWith('reminder-1', 'throttled')
  })

  it('marks failed with a stringified non-Error rejection', async () => {
    mockSmsAdapter.sendSms.mockRejectedValue('weird')
    await useCase.execute(dueNow(24))
    expect(mockRepo.markFailed).toHaveBeenCalledWith('reminder-1', 'weird')
  })

  it('releases the claim (so it retries) when the adapter skips (origination not configured)', async () => {
    mockSmsAdapter.sendSms.mockResolvedValue({ status: 'skipped', providerMessageId: null })
    await useCase.execute(dueNow(24))
    expect(mockRepo.release).toHaveBeenCalledWith('reminder-1')
    expect(mockRepo.markSent).not.toHaveBeenCalled()
  })

  it('honors REMINDER_OFFSETS_HOURS override', async () => {
    mockGetEnvConfig.mockReturnValue({ REMINDER_OFFSETS_HOURS: '48' })
    await useCase.execute(dueNow(48))
    expect(mockRepo.claim).toHaveBeenCalledWith('appt-1', 'clinic-1', '48h', 'sms', 'pending')
  })

  it('falls back to default offsets when the override is blank/invalid', async () => {
    mockGetEnvConfig.mockReturnValue({ REMINDER_OFFSETS_HOURS: ' , abc ' })
    await useCase.execute(dueNow(24))
    expect(mockRepo.claim).toHaveBeenCalledWith('appt-1', 'clinic-1', '24h', 'sms', 'pending')
  })
})
