import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { faker } from '@faker-js/faker'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { LoginUseCase } from '../use-cases/login.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { IAuthEnv } from '../use-cases/auth-env.token'
import { User } from '../../users/entities/user.entity'
import { UserRole } from '@app/shared'

jest.mock('bcrypt', () => ({ compare: jest.fn() }))

const mockDataSource = {} as unknown as DataSource

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
    role: UserRole.USER,
    version: 1,
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

  it('returns { user, accessToken, refreshToken } on valid credentials', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token')
    mockRefreshTokensRepository.create.mockResolvedValue({} as any)

    const result = await useCase.execute({ email: user.email, password: 'password123' })

    expect(result).toEqual({
      user: { id: user.id, fullName: user.fullName, email: user.email },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenMaxAge: 900 * 1000,
      refreshTokenMaxAge: 7 * 86400 * 1000,
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

  it('persists refresh token in repository', async () => {
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
    )
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

  it('throws when refresh token creation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findByEmail.mockResolvedValue(user)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    mockJwtService.signAsync.mockResolvedValue('token')
    mockRefreshTokensRepository.create.mockRejectedValue(new Error('DB error'))

    await expect(
      useCase.execute({ email: user.email, password: 'password123' }),
    ).rejects.toThrow('DB error')
  })
})
