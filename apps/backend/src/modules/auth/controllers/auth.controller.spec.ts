import { Response } from 'express'
import { AuthController } from './auth.controller'
import { LoginUseCase } from '../use-cases/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'

const mockLoginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>
const mockRefreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>
const mockLogoutUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LogoutUseCase>
const mockMeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<MeUseCase>

function makeMockResponse(): jest.Mocked<Pick<Response, 'cookie'>> {
  return { cookie: jest.fn() }
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthController(mockLoginUseCase, mockRefreshTokenUseCase, mockLogoutUseCase, mockMeUseCase)
  })

  describe('login', () => {
    const useCaseResult = {
      user: { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' },
      accessToken: 'access-token-value',
      refreshToken: 'refresh-token-value',
      accessTokenMaxAge: 900 * 1000,
      refreshTokenMaxAge: 7 * 86400 * 1000,
    }

    it('delegates to LoginUseCase with the received dto', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const dto = { email: 'alice@example.com', password: 'password123' } as any

      await controller.login(dto, makeMockResponse() as any)

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(dto)
    })

    it('sets access_token cookie with httpOnly, secure and sameSite strict', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123' } as any, mockResponse as any)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token-value',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
        }),
      )
    })

    it('sets refresh_token cookie with httpOnly, secure and sameSite strict', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123' } as any, mockResponse as any)

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-value',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
        }),
      )
    })

    it('maxAge of access_token cookie equals JWT_EXPIRATION in milliseconds', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123' } as any, mockResponse as any)

      const [, , options] = (mockResponse.cookie as jest.Mock).mock.calls[0]
      expect(options.maxAge).toBe(900 * 1000)
    })

    it('maxAge of refresh_token cookie equals JWT_REFRESH_EXPIRATION in milliseconds', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123' } as any, mockResponse as any)

      const [, , options] = (mockResponse.cookie as jest.Mock).mock.calls[1]
      expect(options.maxAge).toBe(7 * 86400 * 1000)
    })

    it('returns only user data in body without tokens', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      const result = await controller.login(
        { email: 'alice@example.com', password: 'password123' } as any,
        mockResponse as any,
      )

      expect(result).toEqual({ id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' })
      expect(result).not.toHaveProperty('accessToken')
      expect(result).not.toHaveProperty('refreshToken')
    })
  })

  it('delegates refresh to RefreshTokenUseCase', async () => {
    const dto = { refreshToken: 'rt' } as any
    const response = { accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 900 }
    mockRefreshTokenUseCase.execute.mockResolvedValue(response as any)

    const result = await controller.refresh(dto)

    expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('delegates logout to LogoutUseCase', async () => {
    const dto = { refreshToken: 'rt' } as any
    mockLogoutUseCase.execute.mockResolvedValue(undefined)

    await controller.logout(dto)

    expect(mockLogoutUseCase.execute).toHaveBeenCalledWith(dto)
  })

  it('delegates me to MeUseCase using userId from authUser', async () => {
    const authUser = { userId: 'user-uuid', email: 'user@example.com' }
    const meResult = { id: 'user-uuid', fullName: 'Alice Costa', email: 'user@example.com' }
    mockMeUseCase.execute.mockResolvedValue(meResult)

    const result = await controller.me(authUser)

    expect(mockMeUseCase.execute).toHaveBeenCalledWith('user-uuid')
    expect(result).toBe(meResult)
  })
})
