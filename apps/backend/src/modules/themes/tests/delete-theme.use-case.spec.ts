import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { DeleteThemeUseCase } from '../use-cases/delete-theme.use-case'

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
  name: 'Rosé Cuidado',
  slug: 'rose-cuidado',
  isDefault: false,
  accentColor: '#E11D48',
  accentSoftColor: '#FFE4E6',
  borderRadius: 'default',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('DeleteThemeUseCase', () => {
  let useCase: DeleteThemeUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteThemeUseCase({} as DataSource, mockThemesRepository, mockCacheService)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
    mockThemesRepository.delete.mockResolvedValue(undefined)
  })

  it('deletes theme successfully', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.countClinicsByThemeId.mockResolvedValue(0)

    await useCase.execute(theme.id)

    expect(mockThemesRepository.delete).toHaveBeenCalledWith(theme.id)
  })

  it('throws NotFoundException when theme does not exist', async () => {
    mockThemesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
    expect(mockThemesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when deleting the default theme', async () => {
    mockThemesRepository.findById.mockResolvedValue(makeTheme({ isDefault: true }) as any)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(UnprocessableEntityException)
    expect(mockThemesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ConflictException when theme is assigned to clinics', async () => {
    mockThemesRepository.findById.mockResolvedValue(makeTheme() as any)
    mockThemesRepository.countClinicsByThemeId.mockResolvedValue(3)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(ConflictException)
    expect(mockThemesRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates cache after deletion', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.countClinicsByThemeId.mockResolvedValue(0)

    await useCase.execute(theme.id)

    expect(mockCacheService.del).toHaveBeenCalledWith(`theme:${theme.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('themes:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const theme = makeTheme()
    mockThemesRepository.findById.mockResolvedValue(theme as any)
    mockThemesRepository.countClinicsByThemeId.mockResolvedValue(0)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(theme.id)).resolves.not.toThrow()
  })
})
