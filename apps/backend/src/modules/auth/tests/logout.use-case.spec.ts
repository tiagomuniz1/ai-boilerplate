import { faker } from '@faker-js/faker'
import { DataSource, QueryRunner } from 'typeorm'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { RefreshToken } from '../entities/refresh-token.entity'
import { User } from '../../users/entities/user.entity'

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

const mockRefreshTokensRepository: jest.Mocked<IRefreshTokensRepository> = {
  create: jest.fn(),
  findByToken: jest.fn(),
  revokeByToken: jest.fn(),
  revokeAllByUserId: jest.fn(),
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

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LogoutUseCase(mockDataSource, mockRefreshTokensRepository)
  })

  it('revokes token and commits transaction on valid active token', async () => {
    mockRefreshTokensRepository.findByToken.mockResolvedValue(makeStoredToken())
    mockRefreshTokensRepository.revokeByToken.mockResolvedValue(undefined)

    await useCase.execute({ refreshToken: 'valid-token' })

    expect(mockRefreshTokensRepository.revokeByToken).toHaveBeenCalledWith(
      'valid-token',
      mockQueryRunner,
    )
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('returns without error when token does not exist (idempotent)', async () => {
    mockRefreshTokensRepository.findByToken.mockResolvedValue(null)

    await expect(useCase.execute({ refreshToken: 'nonexistent-token' })).resolves.toBeUndefined()

    expect(mockRefreshTokensRepository.revokeByToken).not.toHaveBeenCalled()
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled()
  })

  it('returns without error when token is already revoked (idempotent)', async () => {
    mockRefreshTokensRepository.findByToken.mockResolvedValue(
      makeStoredToken({ revokedAt: new Date() }),
    )

    await expect(useCase.execute({ refreshToken: 'already-revoked' })).resolves.toBeUndefined()

    expect(mockRefreshTokensRepository.revokeByToken).not.toHaveBeenCalled()
  })

  it('rolls back transaction if revokeByToken fails', async () => {
    mockRefreshTokensRepository.findByToken.mockResolvedValue(makeStoredToken())
    mockRefreshTokensRepository.revokeByToken.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute({ refreshToken: 'valid-token' })).rejects.toThrow('DB error')

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
  })
})
