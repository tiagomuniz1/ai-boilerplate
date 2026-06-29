import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { SetPasswordUseCase } from './set-password.use-case'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'

const mockPasswordSetTokensRepository: jest.Mocked<IPasswordSetTokensRepository> = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  markAsUsed: jest.fn(),
}

const mockUsersRepository: jest.Mocked<Pick<IUsersRepository, 'updatePassword'>> = {
  updatePassword: jest.fn(),
} as any

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { getRepository: jest.fn() },
  }),
} as unknown as DataSource

const makeRecord = (overrides: object = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  clinicId: faker.string.uuid(),
  usedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
})

describe('SetPasswordUseCase', () => {
  let useCase: SetPasswordUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SetPasswordUseCase(
      mockDataSource,
      mockPasswordSetTokensRepository,
      mockUsersRepository as any,
    )
  })

  it('updates password and marks token as used within transaction', async () => {
    const record = makeRecord()
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(record as any)
    mockUsersRepository.updatePassword.mockResolvedValue(undefined)
    mockPasswordSetTokensRepository.markAsUsed.mockResolvedValue(undefined)

    await useCase.execute({ token: 'validtoken', password: 'newpassword123' })

    expect(mockUsersRepository.updatePassword).toHaveBeenCalledWith(
      record.userId,
      expect.stringMatching(/^\$2[ab]\$10\$/),
      expect.anything(),
    )
    expect(mockPasswordSetTokensRepository.markAsUsed).toHaveBeenCalledWith(
      record.id,
      expect.anything(),
    )
  })

  it('throws NotFoundException when token is not found', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(null)

    await expect(
      useCase.execute({ token: 'badtoken', password: 'password123' }),
    ).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when token is already used', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(
      makeRecord({ usedAt: new Date() }) as any,
    )

    await expect(
      useCase.execute({ token: 'usedtoken', password: 'password123' }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when token is expired', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(
      makeRecord({ expiresAt: new Date(Date.now() - 1000) }) as any,
    )

    await expect(
      useCase.execute({ token: 'expiredtoken', password: 'password123' }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('hashes the new password before storing', async () => {
    const record = makeRecord()
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(record as any)
    mockUsersRepository.updatePassword.mockResolvedValue(undefined)
    mockPasswordSetTokensRepository.markAsUsed.mockResolvedValue(undefined)

    const plainPassword = 'mysecretpass'
    await useCase.execute({ token: 'token', password: plainPassword })

    const [, storedHash] = mockUsersRepository.updatePassword.mock.calls[0]
    expect(storedHash).not.toBe(plainPassword)
    expect(storedHash).toMatch(/^\$2[ab]\$10\$/)
  })
})
