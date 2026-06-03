import { UnauthorizedException } from '@nestjs/common'
import { Response } from 'express'
import { UserRole } from '@app/shared'
import { AuthController } from './auth.controller'
import { LoginUseCase } from '../use-cases/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'

const mockLoginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>
const mockRefreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>
const mockLogoutUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LogoutUseCase>
const mockMeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<MeUseCase>

function makeMockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return { cookie: jest.fn(), clearCookie: jest.fn() }
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthController(mockLoginUseCase, mockRefreshTokenUseCase, mockLogoutUseCase, mockMeUseCase)
  })

  describe('login', () => {
    const useCaseResult = {
      user: { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: UserRole.USER },
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

      expect(result).toEqual({ id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: UserRole.USER })
      expect(result).not.toHaveProperty('accessToken')
      expect(result).not.toHaveProperty('refreshToken')
    })
  })

  describe('refresh', () => {
    const useCaseResult = {
      accessToken: 'new-at',
      refreshToken: 'new-rt',
      expiresIn: 900,
      refreshTokenExpiresIn: 604800,
    }

    it('reads refresh_token from cookie and delegates to RefreshTokenUseCase', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes)

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt' })
    })

    it('sets new access_token and refresh_token cookies', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes)

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-at',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      )
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-rt',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      )
    })

    it('maxAge of access_token equals expiresIn * 1000', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes)

      const [, , options] = (mockRes.cookie as jest.Mock).mock.calls[0]
      expect(options.maxAge).toBe(900 * 1000)
    })

    it('maxAge of refresh_token equals refreshTokenExpiresIn * 1000', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes)

      const [, , options] = (mockRes.cookie as jest.Mock).mock.calls[1]
      expect(options.maxAge).toBe(604800 * 1000)
    })

    it('throws UnauthorizedException when refresh_token cookie is absent', async () => {
      const mockReq = { cookies: {} } as any
      const mockRes = makeMockResponse() as any

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(UnauthorizedException)
      expect(mockRefreshTokenUseCase.execute).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('reads refresh_token from cookie and delegates to LogoutUseCase', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes)

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt' })
    })

    it('clears access_token and refresh_token cookies', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes)

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' }))
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' }))
    })

    it('skips LogoutUseCase when refresh_token cookie is absent', async () => {
      const mockReq = { cookies: {} } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes)

      expect(mockLogoutUseCase.execute).not.toHaveBeenCalled()
    })
  })

  it('delegates me to MeUseCase using id from authUser', async () => {
    const authUser = { id: 'user-uuid', email: 'user@example.com', role: 'user' as any }
    const meResult = { id: 'user-uuid', fullName: 'Alice Costa', email: 'user@example.com', role: UserRole.USER }
    mockMeUseCase.execute.mockResolvedValue(meResult)

    const result = await controller.me(authUser)

    expect(mockMeUseCase.execute).toHaveBeenCalledWith('user-uuid')
    expect(result).toBe(meResult)
  })
})
