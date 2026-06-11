import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { FindAllThemesUseCase } from '../use-cases/find-all-themes.use-case'

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
  name: 'Azul Clínico',
  slug: 'azul-clinico',
  isDefault: true,
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  borderRadius: 'default',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindAllThemesUseCase', () => {
  let useCase: FindAllThemesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllThemesUseCase({} as DataSource, mockThemesRepository, mockCacheService)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns paginated themes', async () => {
    const themes = [makeTheme(), makeTheme({ id: faker.string.uuid(), slug: 'verde-saude', isDefault: false })]
    mockThemesRepository.findAll.mockResolvedValue([themes as any, 2])

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.total).toBe(2)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toMatchObject({ name: 'Azul Clínico', accentColor: '#2563EB' })
  })

  it('returns cached result when available', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result).toBe(cached)
    expect(mockThemesRepository.findAll).not.toHaveBeenCalled()
  })

  it('writes result to cache after fetch', async () => {
    mockThemesRepository.findAll.mockResolvedValue([[makeTheme() as any], 1])

    await useCase.execute({ page: 1, limit: 20 })

    expect(mockCacheService.set).toHaveBeenCalledWith('themes:list:1:20', expect.any(Object), 60)
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockThemesRepository.findAll.mockResolvedValue([[makeTheme() as any], 1])

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.total).toBe(1)
  })

  it('continues when cache write fails', async () => {
    mockThemesRepository.findAll.mockResolvedValue([[makeTheme() as any], 1])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.total).toBe(1)
  })
})
