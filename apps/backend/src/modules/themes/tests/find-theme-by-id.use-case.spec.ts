import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { FindThemeByIdUseCase } from '../use-cases/find-theme-by-id.use-case'

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
  name: 'Verde Saúde',
  slug: 'verde-saude',
  isDefault: false,
  accentColor: '#16A34A',
  accentSoftColor: '#DCFCE7',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindThemeByIdUseCase', () => {
  let useCase: FindThemeByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindThemeByIdUseCase({} as DataSource, mockThemesRepository, mockCacheService)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns theme response when found', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)

    const result = await useCase.execute(theme.id)

    expect(result.id).toBe(theme.id)
    expect(result.accentColor).toBe('#16A34A')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws NotFoundException when theme does not exist', async () => {
    mockThemesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
  })

  it('returns cached theme when available', async () => {
    const cached = makeTheme()
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(cached.id)

    expect(result).toBe(cached)
    expect(mockThemesRepository.findById).not.toHaveBeenCalled()
  })

  it('writes to cache after successful fetch', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)

    await useCase.execute(theme.id)

    expect(mockCacheService.set).toHaveBeenCalledWith(`theme:${theme.id}`, expect.any(Object), 300)
  })
})
