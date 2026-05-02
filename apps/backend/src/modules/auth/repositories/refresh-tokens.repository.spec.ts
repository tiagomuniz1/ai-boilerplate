import { createHash } from 'crypto'
import { Repository } from 'typeorm'
import { RefreshTokensRepository } from './refresh-tokens.repository'
import { RefreshToken } from '../entities/refresh-token.entity'

function makeRepo(): jest.Mocked<Repository<RefreshToken>> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<RefreshToken>>
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

describe('RefreshTokensRepository', () => {
  let repo: jest.Mocked<Repository<RefreshToken>>
  let repository: RefreshTokensRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new RefreshTokensRepository(repo)
  })

  describe('create', () => {
    it('stores SHA-256 hash of the token, not plaintext', async () => {
      const token = 'my-refresh-token'
      const entity = { tokenHash: sha256(token) } as RefreshToken
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      await repository.create('user-id', token, new Date())

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: sha256(token) }),
      )
      expect(repo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: token }),
      )
    })

    it('sets revokedAt to null on creation', async () => {
      const entity = {} as RefreshToken
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      await repository.create('user-id', 'token', new Date())

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: null }),
      )
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const entity = {} as RefreshToken
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      } as any

      await repository.create('user-id', 'token', new Date(), queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('findByToken', () => {
    it('finds by SHA-256 hash of the token', async () => {
      const token = 'search-token'
      repo.findOneBy.mockResolvedValue(null)

      await repository.findByToken(token)

      expect(repo.findOneBy).toHaveBeenCalledWith({ tokenHash: sha256(token) })
    })

    it('returns null when token not found', async () => {
      repo.findOneBy.mockResolvedValue(null)
      expect(await repository.findByToken('nonexistent')).toBeNull()
    })

    it('returns the stored token when found', async () => {
      const stored = { id: 'uuid', tokenHash: sha256('token') } as RefreshToken
      repo.findOneBy.mockResolvedValue(stored)
      expect(await repository.findByToken('token')).toBe(stored)
    })
  })

  describe('revokeByToken', () => {
    it('updates by SHA-256 hash and sets revokedAt', async () => {
      const token = 'revoke-me'
      repo.update.mockResolvedValue({ affected: 1 } as any)

      await repository.revokeByToken(token)

      expect(repo.update).toHaveBeenCalledWith(
        { tokenHash: sha256(token) },
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      )
    })

    it('uses queryRunner when provided', async () => {
      const qrRepo = makeRepo()
      qrRepo.update.mockResolvedValue({ affected: 1 } as any)
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      } as any

      await repository.revokeByToken('token', queryRunner)

      expect(qrRepo.update).toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('revokeAllByUserId', () => {
    it('builds and executes an update query when no queryRunner', async () => {
      const execute = jest.fn().mockResolvedValue(undefined)
      const where = jest.fn().mockReturnValue({ execute })
      const set = jest.fn().mockReturnValue({ where })
      const update = jest.fn().mockReturnValue({ set })
      repo.createQueryBuilder = jest.fn().mockReturnValue({ update })

      await repository.revokeAllByUserId('user-id')

      expect(execute).toHaveBeenCalled()
    })

    it('uses queryRunner.manager.createQueryBuilder when queryRunner is provided', async () => {
      const execute = jest.fn().mockResolvedValue(undefined)
      const where = jest.fn().mockReturnValue({ execute })
      const set = jest.fn().mockReturnValue({ where })
      const update = jest.fn().mockReturnValue({ set })
      const createQueryBuilder = jest.fn().mockReturnValue({ update })
      const queryRunner = {
        manager: { createQueryBuilder },
      } as any

      await repository.revokeAllByUserId('user-id', queryRunner)

      expect(createQueryBuilder).toHaveBeenCalled()
      expect(execute).toHaveBeenCalled()
    })
  })
})
