jest.mock('../../config/env.config')

import { getEnvConfig } from '../../config/env.config'
import { SendAppointmentRemindersUseCase } from './use-cases/send-appointment-reminders.use-case'
import { RemindersScheduler } from './reminders.scheduler'

const mockGetEnvConfig = getEnvConfig as jest.Mock

const mockUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<SendAppointmentRemindersUseCase>

describe('RemindersScheduler', () => {
  let scheduler: RemindersScheduler

  beforeEach(() => {
    jest.clearAllMocks()
    scheduler = new RemindersScheduler(mockUseCase)
  })

  it('runs the reminder use-case when REMINDERS_ENABLED is true', async () => {
    mockGetEnvConfig.mockReturnValue({ REMINDERS_ENABLED: true })
    await scheduler.handleTick()
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1)
  })

  it('does nothing when REMINDERS_ENABLED is false', async () => {
    mockGetEnvConfig.mockReturnValue({ REMINDERS_ENABLED: false })
    await scheduler.handleTick()
    expect(mockUseCase.execute).not.toHaveBeenCalled()
  })
})
