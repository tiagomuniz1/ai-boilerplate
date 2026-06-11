import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { FindActiveThemeUseCase } from '../use-cases/find-active-theme.use-case'

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
  bgColor: null,
  bgDarkColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindActiveThemeUseCase', () => {
  let useCase: FindActiveThemeUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindActiveThemeUseCase({} as DataSource, mockThemesRepository, mockCacheService)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns null when clinicId is null (PLATFORM_ADMIN)', async () => {
    const result = await useCase.execute(null)
    expect(result).toBeNull()
    expect(mockThemesRepository.findByClinicId).not.toHaveBeenCalled()
  })

  it('returns clinic theme when clinic has an assigned theme', async () => {
    const clinicId = faker.string.uuid()
    const theme = makeTheme({ isDefault: false })
    mockThemesRepository.findByClinicId.mockResolvedValue(theme as any)

    const result = await useCase.execute(clinicId)

    expect(result).not.toBeNull()
    expect(result?.accentColor).toBe('#2563EB')
    expect(mockThemesRepository.findDefault).not.toHaveBeenCalled()
  })

  it('falls back to default theme when clinic has no theme assigned', async () => {
    const clinicId = faker.string.uuid()
    const defaultTheme = makeTheme()
    mockThemesRepository.findByClinicId.mockResolvedValue(null)
    mockThemesRepository.findDefault.mockResolvedValue(defaultTheme as any)

    const result = await useCase.execute(clinicId)

    expect(result?.isDefault).toBe(true)
    expect(mockThemesRepository.findDefault).toHaveBeenCalled()
  })

  it('returns null when clinic has no theme and there is no default', async () => {
    const clinicId = faker.string.uuid()
    mockThemesRepository.findByClinicId.mockResolvedValue(null)
    mockThemesRepository.findDefault.mockResolvedValue(null)

    const result = await useCase.execute(clinicId)

    expect(result).toBeNull()
  })

  it('returns cached result when available', async () => {
    const clinicId = faker.string.uuid()
    const cached = makeTheme()
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(clinicId)

    expect(result).toBe(cached)
    expect(mockThemesRepository.findByClinicId).not.toHaveBeenCalled()
  })
})
