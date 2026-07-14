import { UnauthorizedException } from '@nestjs/common'
import { Response } from 'express'
import { UserRole } from '@app/shared'

// The controller reads COOKIE_DOMAIN from env at construction; mock it so unit
// tests don't require the full env (and so we can exercise the prod domain case).
const mockGetEnvConfig = jest.fn(() => ({ COOKIE_DOMAIN: undefined as string | undefined }))
jest.mock('../../../config/env.config', () => ({
  getEnvConfig: () => mockGetEnvConfig(),
}))

import { AuthController } from './auth.controller'
import { LoginUseCase } from '../use-cases/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'
import { ValidateSetPasswordTokenUseCase } from '../use-cases/validate-set-password-token.use-case'
import { SetPasswordUseCase } from '../use-cases/set-password.use-case'

const mockLoginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>
const mockRefreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>
const mockLogoutUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LogoutUseCase>
const mockMeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<MeUseCase>
const mockValidateSetPasswordTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ValidateSetPasswordTokenUseCase>
const mockSetPasswordUseCase = { execute: jest.fn() } as unknown as jest.Mocked<SetPasswordUseCase>

function makeMockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return { cookie: jest.fn(), clearCookie: jest.fn() }
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEnvConfig.mockReturnValue({ COOKIE_DOMAIN: undefined })
    controller = new AuthController(mockLoginUseCase, mockRefreshTokenUseCase, mockLogoutUseCase, mockMeUseCase, mockValidateSetPasswordTokenUseCase, mockSetPasswordUseCase)
  })

  describe('login', () => {
    const useCaseResult = {
      user: { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: UserRole.USER, clinicId: null },
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

      expect(result).toEqual({ id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com', role: UserRole.USER, clinicId: null })
      expect(result).not.toHaveProperty('accessToken')
      expect(result).not.toHaveProperty('refreshToken')
    })

    it('sets slug-scoped cookies when dto.slug is a clinic slug', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123', slug: 'minha-clinica' } as any, mockResponse as any)

      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token_minha-clinica', 'access-token-value', expect.any(Object))
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token_minha-clinica', 'refresh-token-value', expect.any(Object))
    })

    it('uses generic cookie names when dto.slug is "backoffice"', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123', slug: 'backoffice' } as any, mockResponse as any)

      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'access-token-value', expect.any(Object))
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token-value', expect.any(Object))
    })

    it('does NOT set a cookie Domain when COOKIE_DOMAIN is empty (dev/localhost)', async () => {
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await controller.login({ email: 'alice@example.com', password: 'password123' } as any, mockResponse as any)

      const [, , options] = (mockResponse.cookie as jest.Mock).mock.calls[0]
      expect(options).not.toHaveProperty('domain')
    })

    it('sets cookie Domain from COOKIE_DOMAIN when configured (prod)', async () => {
      mockGetEnvConfig.mockReturnValue({ COOKIE_DOMAIN: '.pulso.center' })
      const prodController = new AuthController(mockLoginUseCase, mockRefreshTokenUseCase, mockLogoutUseCase, mockMeUseCase, mockValidateSetPasswordTokenUseCase, mockSetPasswordUseCase)
      mockLoginUseCase.execute.mockResolvedValue(useCaseResult)
      const mockResponse = makeMockResponse()

      await prodController.login({ email: 'alice@example.com', password: 'password123', slug: 'minha-clinica' } as any, mockResponse as any)

      // Slug-scoped name preserved AND Domain added — the two together isolate
      // multiple clinics in one browser while sharing the parent domain.
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token_minha-clinica',
        'access-token-value',
        expect.objectContaining({ domain: '.pulso.center', httpOnly: true, secure: true, sameSite: 'strict', path: '/' }),
      )
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

      await controller.refresh(mockReq, mockRes, undefined)

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt' })
    })

    it('sets new access_token and refresh_token cookies', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes, undefined)

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

      await controller.refresh(mockReq, mockRes, undefined)

      const [, , options] = (mockRes.cookie as jest.Mock).mock.calls[0]
      expect(options.maxAge).toBe(900 * 1000)
    })

    it('maxAge of refresh_token equals refreshTokenExpiresIn * 1000', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes, undefined)

      const [, , options] = (mockRes.cookie as jest.Mock).mock.calls[1]
      expect(options.maxAge).toBe(604800 * 1000)
    })

    it('throws UnauthorizedException when refresh_token cookie is absent', async () => {
      const mockReq = { cookies: {} } as any
      const mockRes = makeMockResponse() as any

      await expect(controller.refresh(mockReq, mockRes, undefined)).rejects.toThrow(UnauthorizedException)
      expect(mockRefreshTokenUseCase.execute).not.toHaveBeenCalled()
    })

    it('reads slug-scoped refresh cookie when x-clinic-slug header is provided', async () => {
      mockRefreshTokenUseCase.execute.mockResolvedValue(useCaseResult as any)
      const mockReq = { cookies: { refresh_token_minha_clinica: 'rt-clinic' } } as any
      const mockRes = makeMockResponse() as any

      await controller.refresh(mockReq, mockRes, 'minha_clinica')

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt-clinic' })
      expect(mockRes.cookie).toHaveBeenCalledWith('access_token_minha_clinica', 'new-at', expect.any(Object))
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token_minha_clinica', 'new-rt', expect.any(Object))
    })
  })

  describe('logout', () => {
    it('reads refresh_token from cookie and delegates to LogoutUseCase', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes, undefined)

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt' })
    })

    it('clears access_token and refresh_token cookies', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined)
      const mockReq = { cookies: { refresh_token: 'rt' } } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes, undefined)

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' }))
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' }))
    })

    it('skips LogoutUseCase when refresh_token cookie is absent', async () => {
      const mockReq = { cookies: {} } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes, undefined)

      expect(mockLogoutUseCase.execute).not.toHaveBeenCalled()
    })

    it('reads and clears slug-scoped cookies when slug is provided in body', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined)
      const mockReq = { cookies: { refresh_token_minha_clinica: 'rt-clinic' } } as any
      const mockRes = { clearCookie: jest.fn() } as any

      await controller.logout(mockReq, mockRes, { slug: 'minha_clinica' })

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'rt-clinic' })
      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token_minha_clinica', expect.any(Object))
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token_minha_clinica', expect.any(Object))
    })
  })

  describe('validateSetPasswordToken', () => {
    it('delegates to ValidateSetPasswordTokenUseCase and returns result', async () => {
      const result = { valid: true, email: 'doc@example.com' }
      mockValidateSetPasswordTokenUseCase.execute.mockResolvedValue(result as any)

      const response = await controller.validateSetPasswordToken({ token: 'tok-abc' })

      expect(mockValidateSetPasswordTokenUseCase.execute).toHaveBeenCalledWith('tok-abc')
      expect(response).toBe(result)
    })
  })

  describe('setPassword', () => {
    it('delegates to SetPasswordUseCase', async () => {
      mockSetPasswordUseCase.execute.mockResolvedValue(undefined)
      const dto = { token: 'tok-abc', password: 'Senha@123' }

      await controller.setPassword(dto as any)

      expect(mockSetPasswordUseCase.execute).toHaveBeenCalledWith(dto)
    })
  })

  it('delegates me to MeUseCase using id from authUser', async () => {
    const authUser = { id: 'user-uuid', role: 'user' as any, clinicId: 'clinic-uuid' }
    const meResult = { id: 'user-uuid', fullName: 'Alice Costa', email: 'user@example.com', role: UserRole.USER, clinicId: 'clinic-uuid' }
    mockMeUseCase.execute.mockResolvedValue(meResult)

    const result = await controller.me(authUser)

    expect(mockMeUseCase.execute).toHaveBeenCalledWith('user-uuid', 'clinic-uuid')
    expect(result).toBe(meResult)
  })
})
