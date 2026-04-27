import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { faker } from '@faker-js/faker'
import { DataSource, QueryRunner } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { LoginUseCase } from '../use-cases/login.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { IAuthEnv } from '../use-cases/auth-env.token'
import { User } from '../../users/entities/user.entity'

jest.mock('bcrypt', () => ({ compare: jest.fn() }))

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
  findById: jest.fn(),
  findByEmail: jest.fn(),
}

const mockRefreshTokensRepository: jest.Mocked<IRefreshTokensRepository> = {
  create: jest.fn(),
  findByToken: jest.fn(),
  revokeByToken: jest.fn(),
  revokeAllByUserId: jest.fn(),
}

const mockJwtService = {
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
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

describe('LoginUseCase', () => {
  let useCase: LoginUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LoginUseCase(
      mockDataSource,
      mockUsersRepository,
      mockRefreshTokensRepository,
      mockJwtService,
      mockAuthEnv,
    )
  })

  it('returns accessToken, refreshToken and expiresIn on valid credentials', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token')
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    const result = await useCase.execute({ email: user.email, password: 'password123' })

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    })
  })

  it('signs access token with correct payload and expiration', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync.mockResolvedValue('token')
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    await useCase.execute({ email: user.email, password: 'password123' })

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      { sub: user.id, email: user.email },
      { expiresIn: '900s' },
    )
  })

  it('signs refresh token with type:refresh payload', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync.mockResolvedValue('token')
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    await useCase.execute({ email: user.email, password: 'password123' })

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, type: 'refresh' }),
      { expiresIn: '7d' },
    )
  })

  it('persists refresh token in transaction', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token')
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    await useCase.execute({ email: user.email, password: 'password123' })

    expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith(
      user.id,
      'refresh-token',
      expect.any(Date),
      mockQueryRunner,
    )
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('throws generic UnauthorizedException when user is not found', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null)

    await expect(
      useCase.execute({ email: faker.internet.email(), password: 'password123' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'))

    expect(mockRefreshTokensRepository.create).not.toHaveBeenCalled()
  })

  it('throws generic UnauthorizedException when password is incorrect', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(makeUser())
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    await expect(
      useCase.execute({ email: faker.internet.email(), password: 'wrongpassword' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'))
  })

  it('error message is identical for missing user and wrong password', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    const err1 = await useCase
      .execute({ email: faker.internet.email(), password: 'password123' })
      .catch((e) => e)

    mockUsersRepository.findByEmail.mockResolvedValue(makeUser())
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const err2 = await useCase
      .execute({ email: faker.internet.email(), password: 'wrongpassword' })
      .catch((e) => e)

    expect(err1.message).toBe(err2.message)
  })

  it('rolls back transaction when refresh token creation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync.mockResolvedValue('token')
    mockRefreshTokensRepository.create.mockRejectedValue(new Error('DB error'))

    await expect(
      useCase.execute({ email: user.email, password: 'password123' }),
    ).rejects.toThrow('DB error')

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
  })
})
