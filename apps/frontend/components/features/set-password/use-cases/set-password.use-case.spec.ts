jest.mock('../services/set-password.service')

import { setPasswordService } from '../services/set-password.service'
import { setPasswordUseCase } from './set-password.use-case'

const mockService = setPasswordService as jest.Mocked<typeof setPasswordService>

describe('setPasswordUseCase', () => {
  it('delegates to setPasswordService.setPassword with correct data', async () => {
    mockService.setPassword.mockResolvedValue(undefined)

    await setPasswordUseCase({ token: 'tok123', password: 'newpass1' })

    expect(mockService.setPassword).toHaveBeenCalledWith({ token: 'tok123', password: 'newpass1' })
  })

  it('propagates errors from the service', async () => {
    mockService.setPassword.mockRejectedValue({ status: 422, title: 'Unprocessable Entity' })

    await expect(
      setPasswordUseCase({ token: 'used', password: 'password1' }),
    ).rejects.toMatchObject({ status: 422 })
  })
})
