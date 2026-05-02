import { UnauthorizedException } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { DataSource } from 'typeorm'
import { MeUseCase } from '../use-cases/me.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { User } from '../../users/entities/user.entity'
import { UserRole } from '@app/shared'

const mockDataSource = {} as unknown as DataSource

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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

describe('MeUseCase', () => {
  let useCase: MeUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new MeUseCase(mockDataSource, mockUsersRepository)
  })

  it('returns user data when user exists', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    const result = await useCase.execute(user.id)

    expect(result).toEqual({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    })
    expect(mockUsersRepository.findById).toHaveBeenCalledWith(user.id)
  })

  it('throws UnauthorizedException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(UnauthorizedException)
  })
})
