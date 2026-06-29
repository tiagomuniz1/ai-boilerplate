import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { createHash } from 'crypto'
import { ValidateSetPasswordTokenUseCase } from './validate-set-password-token.use-case'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'

const mockPasswordSetTokensRepository: jest.Mocked<IPasswordSetTokensRepository> = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  markAsUsed: jest.fn(),
}

const mockUsersRepository: jest.Mocked<Pick<IUsersRepository, 'findById'>> = {
  findById: jest.fn(),
} as any

const makeToken = (overrides: object = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  clinicId: faker.string.uuid(),
  usedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
})

const makeUser = () => ({ id: faker.string.uuid(), email: faker.internet.email() })

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

describe('ValidateSetPasswordTokenUseCase', () => {
  let useCase: ValidateSetPasswordTokenUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ValidateSetPasswordTokenUseCase(
      {} as DataSource,
      mockPasswordSetTokensRepository,
      mockUsersRepository as any,
    )
  })

  it('returns { valid: true, email } for a valid token', async () => {
    const token = 'plaintexttoken'
    const record = makeToken()
    const user = makeUser()
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(record as any)
    mockUsersRepository.findById.mockResolvedValue(user as any)

    const result = await useCase.execute(token)

    expect(mockPasswordSetTokensRepository.findByTokenHash).toHaveBeenCalledWith(hashToken(token))
    expect(result).toEqual({ valid: true, email: user.email })
  })

  it('returns { valid: false } when token is not found', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(null)

    const result = await useCase.execute('unknowntoken')

    expect(result).toEqual({ valid: false, email: null })
    expect(mockUsersRepository.findById).not.toHaveBeenCalled()
  })

  it('returns { valid: false } when token is already used', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(
      makeToken({ usedAt: new Date() }) as any,
    )

    const result = await useCase.execute('usedtoken')

    expect(result).toEqual({ valid: false, email: null })
  })

  it('returns { valid: false } when token is expired', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1000) }) as any,
    )

    const result = await useCase.execute('expiredtoken')

    expect(result).toEqual({ valid: false, email: null })
  })

  it('returns { valid: false } when user is not found', async () => {
    mockPasswordSetTokensRepository.findByTokenHash.mockResolvedValue(makeToken() as any)
    mockUsersRepository.findById.mockResolvedValue(null)

    const result = await useCase.execute('sometoken')

    expect(result).toEqual({ valid: false, email: null })
  })
})
