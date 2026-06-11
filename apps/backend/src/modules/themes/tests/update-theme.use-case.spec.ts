import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { UpdateThemeUseCase } from '../use-cases/update-theme.use-case'

const mockThemesRepository: jest.Mocked<IThemesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findDefault: jest.fn(),
  findByClinicId: jest.fn(),
  countClinicsByThemeId: jest.fn(),
  clearDefaultExcept: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeTheme = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Roxo Bem-Estar',
  slug: 'roxo-bem-estar',
  isDefault: false,
  accentColor: '#7C3AED',
  accentSoftColor: '#EDE9FE',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

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

describe('UpdateThemeUseCase', () => {
  let useCase: UpdateThemeUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateThemeUseCase(mockDataSource, mockThemesRepository, mockCacheService)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('updates and returns theme', async () => {
    const theme = makeTheme()
    const updated = makeTheme({ name: 'Roxo Claro', accentColor: '#8B5CF6' })
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(theme.id, { name: 'Roxo Claro', accentColor: '#8B5CF6' })

    expect(result.name).toBe('Roxo Claro')
    expect(result.accentColor).toBe('#8B5CF6')
  })

  it('throws NotFoundException when theme does not exist', async () => {
    mockThemesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { name: 'Novo nome' })).rejects.toThrow(NotFoundException)
    expect(mockThemesRepository.update).not.toHaveBeenCalled()
  })

  it('invalidates caches after update', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.update.mockResolvedValue(theme as any)

    await useCase.execute(theme.id, { name: 'Novo nome' })

    expect(mockCacheService.del).toHaveBeenCalledWith(`theme:${theme.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('themes:list*')
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('theme:clinic:*')
  })

  it('continues when cache invalidation fails', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.update.mockResolvedValue(theme as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(theme.id, { name: 'Novo nome' })

    expect(result.id).toBeDefined()
  })
})
