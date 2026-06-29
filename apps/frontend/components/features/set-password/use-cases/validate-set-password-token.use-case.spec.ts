jest.mock('../services/set-password.service')

import { setPasswordService } from '../services/set-password.service'
import { validateSetPasswordTokenUseCase } from './validate-set-password-token.use-case'

const mockService = setPasswordService as jest.Mocked<typeof setPasswordService>

describe('validateSetPasswordTokenUseCase', () => {
  it('delegates to setPasswordService.validate and returns result', async () => {
    const response = { valid: true, email: 'doc@example.com' }
    mockService.validate.mockResolvedValue(response)

    const result = await validateSetPasswordTokenUseCase('mytoken')

    expect(mockService.validate).toHaveBeenCalledWith('mytoken')
    expect(result).toEqual(response)
  })

  it('returns { valid: false, email: null } when service returns invalid', async () => {
    mockService.validate.mockResolvedValue({ valid: false, email: null })

    const result = await validateSetPasswordTokenUseCase('expired')

    expect(result).toEqual({ valid: false, email: null })
  })
})
