import { NotificationAdapter } from './notification.adapter'

describe('NotificationAdapter', () => {
  let adapter: NotificationAdapter

  beforeEach(() => {
    adapter = new NotificationAdapter()
  })

  it('logs and resolves when sending account activation email', async () => {
    const logSpy = jest.spyOn((adapter as any).logger, 'log').mockImplementation()

    await adapter.sendAccountActivationEmail('user@example.com', 'Alice')

    expect(logSpy).toHaveBeenCalledWith('Account activation email queued', {
      to: 'user@example.com',
      fullName: 'Alice',
    })
    logSpy.mockRestore()
  })
})
