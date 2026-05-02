import { UnauthorizedException } from '@nestjs/common'
import { JwtService, TokenExpiredError } from '@nestjs/jwt'
import { faker } from '@faker-js/faker'
import { DataSource, QueryRunner } from 'typeorm'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { IAuthEnv } from '../use-cases/auth-env.token'
import { RefreshToken } from '../entities/refresh-token.entity'
import { User } from '../../users/entities/user.entity'
import { UserRole } from '@app/shared'

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockRefreshTokensRepository: jest.Mocked<IRefreshTokensRepository> = {
  create: jest.fn(),
  findByToken: jest.fn(),
  revokeByToken: jest.fn(),
  revokeAllByUserId: jest.fn(),
}

const mockJwtService = {
  verifyAsync: jest.fn(),
  signAsync: jest.fn(),
} as unknown as jest.Mocked<JwtService>

const mockAuthEnv: IAuthEnv = {
  jwtSecret: 'test-secret',
  jwtExpiration: '900s',
  jwtRefreshExpiration: '7d',
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hashed',
    role: UserRole.USER,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    deletedAt: null,
    ...overrides,
  }
}

function makeStoredToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    tokenHash: faker.string.alphanumeric(64),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    deletedAt: null,
    user: {} as User,
    ...overrides,
  }
}

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RefreshTokenUseCase(
      mockDataSource,
      mockUsersRepository,
      mockRefreshTokensRepository,
      mockJwtService,
      mockAuthEnv,
    )
  })

  it('returns new access and refresh tokens on valid token', async () => {
    const user = makeUser()
    const storedToken = makeStoredToken({ userId: user.id })

    mockJwtService.verifyAsync.mockResolvedValue({ sub: user.id, type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(storedToken)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockJwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token')
    mockRefreshTokensRepository.revokeByToken.mockResolvedValue(undefined)
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    const result = await useCase.execute({ refreshToken: 'old-refresh-token' })

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
    })
  })

  it('revokes old token and creates new one in transaction', async () => {
    const user = makeUser()
    mockJwtService.verifyAsync.mockResolvedValue({ sub: user.id, type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(makeStoredToken())
    mockUsersRepository.findById.mockResolvedValue(user)
    mockJwtService.signAsync.mockResolvedValue('token')
    mockRefreshTokensRepository.revokeByToken.mockResolvedValue(undefined)
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    await useCase.execute({ refreshToken: 'old-refresh-token' })

    expect(mockRefreshTokensRepository.revokeByToken).toHaveBeenCalledWith(
      'old-refresh-token',
      mockQueryRunner,
    )
    expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith(
      user.id,
      'token',
      expect.any(Date),
      mockQueryRunner,
    )
  })

  it('throws UnauthorizedException with "Refresh token expired" when JWT is expired', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(
      new TokenExpiredError('jwt expired', new Date()),
    )

    await expect(
      useCase.execute({ refreshToken: 'expired-token' }),
    ).rejects.toThrow(new UnauthorizedException('Refresh token expired'))
  })

  it('throws UnauthorizedException with "Invalid refresh token" when JWT is malformed', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'))

    await expect(
      useCase.execute({ refreshToken: 'malformed-token' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'))
  })

  it('throws UnauthorizedException when token type is not refresh', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: faker.string.uuid(), type: 'access' })

    await expect(
      useCase.execute({ refreshToken: 'access-token-used-as-refresh' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'))
  })

  it('throws UnauthorizedException when token is not found in database', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: faker.string.uuid(), type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(null)

    await expect(
      useCase.execute({ refreshToken: 'not-stored-token' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'))
  })

  it('throws UnauthorizedException when token is revoked', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: faker.string.uuid(), type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(
      makeStoredToken({ revokedAt: new Date() }),
    )

    await expect(
      useCase.execute({ refreshToken: 'revoked-token' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'))
  })

  it('throws UnauthorizedException when token is expired in database', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: faker.string.uuid(), type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(
      makeStoredToken({ expiresAt: new Date(Date.now() - 1000) }),
    )

    await expect(
      useCase.execute({ refreshToken: 'db-expired-token' }),
    ).rejects.toThrow(new UnauthorizedException('Refresh token expired'))
  })

  it('throws UnauthorizedException when user no longer exists', async () => {
    const userId = faker.string.uuid()
    mockJwtService.verifyAsync.mockResolvedValue({ sub: userId, type: 'refresh' })
    mockRefreshTokensRepository.findByToken.mockResolvedValue(makeStoredToken({ userId }))
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ refreshToken: 'orphaned-token' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'))
  })
})
