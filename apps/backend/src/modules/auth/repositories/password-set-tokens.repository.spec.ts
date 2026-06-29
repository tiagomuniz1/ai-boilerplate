import { Repository } from 'typeorm'
import { PasswordSetTokensRepository } from './password-set-tokens.repository'
import { PasswordSetToken } from '../entities/password-set-token.entity'

function makeRepo(): jest.Mocked<Repository<PasswordSetToken>> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<PasswordSetToken>>
}

describe('PasswordSetTokensRepository', () => {
  let repo: jest.Mocked<Repository<PasswordSetToken>>
  let repository: PasswordSetTokensRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new PasswordSetTokensRepository(repo)
  })

  describe('create', () => {
    it('saves entity with usedAt = null', async () => {
      const data = {
        userId: 'user-1',
        clinicId: 'clinic-1',
        tokenHash: 'hashvalue',
        expiresAt: new Date(),
      }
      const entity = { ...data, usedAt: null } as PasswordSetToken
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith({ ...data, usedAt: null })
      expect(repo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('accepts null clinicId', async () => {
      const data = { userId: 'user-1', clinicId: null, tokenHash: 'hash', expiresAt: new Date() }
      const entity = { ...data, usedAt: null } as unknown as PasswordSetToken
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ clinicId: null }))
    })
  })

  describe('findByTokenHash', () => {
    it('returns token when found', async () => {
      const token = { id: 'tok-1', tokenHash: 'hash' } as PasswordSetToken
      repo.findOneBy.mockResolvedValue(token)

      const result = await repository.findByTokenHash('hash')

      expect(repo.findOneBy).toHaveBeenCalledWith({ tokenHash: 'hash' })
      expect(result).toBe(token)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      const result = await repository.findByTokenHash('unknown')

      expect(result).toBeNull()
    })
  })

  describe('markAsUsed', () => {
    it('updates usedAt to a non-null Date using main repository', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as any)

      await repository.markAsUsed('tok-1')

      const [id, data] = repo.update.mock.calls[0]
      expect(id).toBe('tok-1')
      expect(data.usedAt).toBeInstanceOf(Date)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      qrRepo.update.mockResolvedValue({ affected: 1 } as any)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.markAsUsed('tok-1', queryRunner)

      expect(qrRepo.update).toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
    })
  })
})
