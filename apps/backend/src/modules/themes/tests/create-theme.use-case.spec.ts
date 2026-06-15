import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { CreateThemeUseCase } from '../use-cases/create-theme.use-case'

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
  name: 'Teal Moderno',
  slug: 'teal-moderno',
  isDefault: false,
  accentColor: '#0D9488',
  accentSoftColor: '#CCFBF1',
  borderRadius: 'default',
  bgColor: null,
  bgDarkColor: null,
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

describe('CreateThemeUseCase', () => {
  let useCase: CreateThemeUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateThemeUseCase(mockDataSource, mockThemesRepository, mockCacheService)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('creates theme with generated slug when not provided', async () => {
    const created = makeTheme({ name: 'Teal Moderno', slug: 'teal-moderno' })
    mockThemesRepository.findBySlug.mockResolvedValue(null)
    mockThemesRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute({ name: 'Teal Moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' })

    expect(result.id).toBe(created.id)
    expect(result.accentColor).toBe('#0D9488')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('creates theme with provided slug', async () => {
    const created = makeTheme()
    mockThemesRepository.findBySlug.mockResolvedValue(null)
    mockThemesRepository.create.mockResolvedValue(created as any)

    await useCase.execute({ name: 'Teal Moderno', slug: 'teal-moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' })

    expect(mockThemesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'teal-moderno' }),
    )
  })

  it('throws ConflictException when slug is already in use', async () => {
    mockThemesRepository.findBySlug.mockResolvedValue(makeTheme() as any)

    await expect(
      useCase.execute({ name: 'Outro Tema', slug: 'teal-moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' }),
    ).rejects.toThrow(ConflictException)
    expect(mockThemesRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates list cache after creation', async () => {
    mockThemesRepository.findBySlug.mockResolvedValue(null)
    mockThemesRepository.create.mockResolvedValue(makeTheme() as any)

    await useCase.execute({ name: 'Teal Moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' })

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('themes:list*')
  })

  it('continues when cache invalidation fails', async () => {
    mockThemesRepository.findBySlug.mockResolvedValue(null)
    mockThemesRepository.create.mockResolvedValue(makeTheme() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ name: 'Teal Moderno', accentColor: '#0D9488', accentSoftColor: '#CCFBF1' })

    expect(result.id).toBeDefined()
  })

  it('sets isDefault=true via transaction and clears previous default', async () => {
    const created = makeTheme({ isDefault: true })
    mockThemesRepository.findBySlug.mockResolvedValue(null)
    mockThemesRepository.clearDefaultExcept.mockResolvedValue(undefined)
    mockThemesRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute({
      name: 'Teal Moderno',
      accentColor: '#0D9488',
      accentSoftColor: '#CCFBF1',
      isDefault: true,
    })

    expect(mockThemesRepository.clearDefaultExcept).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000000',
      expect.anything(),
    )
    expect(mockThemesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true }),
      expect.anything(),
    )
    expect(result.isDefault).toBe(true)
  })
})
