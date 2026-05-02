import { Repository } from 'typeorm'
import { UsersRepository } from './users.repository'
import { User } from '../entities/user.entity'
import { UserRole } from '@app/shared'

function makeRepo(): jest.Mocked<Repository<User>> {
  return {
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>
}

describe('UsersRepository', () => {
  let repo: jest.Mocked<Repository<User>>
  let repository: UsersRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new UsersRepository(repo)
  })

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = { id: 'uuid-1', email: 'a@b.com' } as User
      repo.findOneBy.mockResolvedValue(user)

      const result = await repository.findById('uuid-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' })
      expect(result).toBe(user)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = { id: 'uuid-2', email: 'test@example.com' } as User
      repo.findOneBy.mockResolvedValue(user)

      const result = await repository.findByEmail('test@example.com')

      expect(repo.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' })
      expect(result).toBe(user)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByEmail('none@example.com')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('delegates to findAndCount with correct pagination', async () => {
      const users = [{ id: 'u1' } as User]
      repo.findAndCount.mockResolvedValue([users, 1])

      const result = await repository.findAll(2, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      })
      expect(result).toEqual([users, 1])
    })
  })

  describe('create', () => {
    it('creates and saves user using default repository', async () => {
      const data = { fullName: 'Alice', email: 'a@b.com', password: 'hash', role: UserRole.USER }
      const entity = { ...data } as User
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      const result = await repository.create(data as any)

      expect(repo.create).toHaveBeenCalledWith(data)
      expect(repo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const entity = {} as User
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.create({ fullName: 'Bob', email: 'b@c.com', password: 'hash', role: UserRole.USER } as any, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads user, merges data, and saves', async () => {
      const user = { id: 'uuid-1', fullName: 'Old Name', role: UserRole.USER } as User
      const updated = { ...user, fullName: 'New Name' } as User
      repo.findOneByOrFail.mockResolvedValue(user)
      repo.save.mockResolvedValue(updated)

      const result = await repository.update('uuid-1', { fullName: 'New Name' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: 'uuid-1' })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'New Name' }))
      expect(result).toBe(updated)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const user = { id: 'uuid-1' } as User
      qrRepo.findOneByOrFail.mockResolvedValue(user)
      qrRepo.save.mockResolvedValue(user)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update('uuid-1', {}, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the user', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 } as any)

      await repository.delete('uuid-1')

      expect(repo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      qrRepo.softDelete.mockResolvedValue({ affected: 1 } as any)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('uuid-1', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })
})
