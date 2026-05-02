jest.mock('../services/auth.service')
jest.mock('../mappers/to-auth-user-model')

import { authService } from '../services/auth.service'
import { toAuthUserModel } from '../mappers/to-auth-user-model'
import { loginUseCase } from './login.use-case'

describe('loginUseCase', () => {
  it('calls authService.login with input and returns mapped model', async () => {
    const dto = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    const model = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    ;(authService.login as jest.Mock).mockResolvedValue(dto)
    ;(toAuthUserModel as jest.Mock).mockReturnValue(model)

    const input = { email: 'alice@example.com', password: 'password123' }
    const result = await loginUseCase(input)

    expect(authService.login).toHaveBeenCalledWith(input)
    expect(toAuthUserModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from authService.login', async () => {
    const error = { status: 401, title: 'Unauthorized', detail: 'Invalid credentials' }
    ;(authService.login as jest.Mock).mockRejectedValue(error)

    await expect(loginUseCase({ email: 'wrong@example.com', password: 'password123' })).rejects.toEqual(error)
  })
})
