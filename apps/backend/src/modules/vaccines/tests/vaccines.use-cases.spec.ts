import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { Vaccine } from '../entities/vaccine.entity'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'
import { CreateVaccineUseCase } from '../use-cases/create-vaccine.use-case'
import { DeleteVaccineUseCase } from '../use-cases/delete-vaccine.use-case'
import { FindVaccinesUseCase } from '../use-cases/find-vaccines.use-case'
import { GetVaccineUseCase } from '../use-cases/get-vaccine.use-case'
import { UpdateVaccineUseCase } from '../use-cases/update-vaccine.use-case'

const mockRepository: jest.Mocked<IVaccinesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeVaccine(overrides: Partial<Vaccine> = {}): Vaccine {
  return {
    id: 'v1',
    name: 'Tríplice viral',
    abbreviation: 'SCR',
    preventedDiseases: 'sarampo, caxumba, rubéola',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Vaccine
}

const platformAdmin: ICurrentUser = { id: 'u1', role: UserRole.PLATFORM_ADMIN, clinicId: null } as ICurrentUser
const clinicAdmin: ICurrentUser = { id: 'u2', role: UserRole.ADMIN, clinicId: 'c1' } as ICurrentUser

describe('Vaccines use-cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheService.get.mockResolvedValue(null)
  })

  describe('CreateVaccineUseCase', () => {
    let useCase: CreateVaccineUseCase

    beforeEach(() => {
      useCase = new CreateVaccineUseCase({} as DataSource, mockRepository, mockCacheService)
    })

    it('creates the vaccine as active and invalidates the list', async () => {
      mockRepository.findByName.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(makeVaccine())

      const result = await useCase.execute({ name: 'Tríplice viral', abbreviation: 'SCR' })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Tríplice viral', abbreviation: 'SCR', isActive: true }),
      )
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('vaccines:list*')
      expect(result.name).toBe('Tríplice viral')
    })

    // Duas vacinas de mesmo nome não seriam distinguíveis no seletor.
    it('rejects a duplicate name with 409', async () => {
      mockRepository.findByName.mockResolvedValue(makeVaccine())

      await expect(useCase.execute({ name: 'tríplice viral' })).rejects.toThrow(ConflictException)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('stores nulls for the optional fields instead of undefined', async () => {
      mockRepository.findByName.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(makeVaccine())

      await useCase.execute({ name: 'BCG' })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ abbreviation: null, preventedDiseases: null }),
      )
    })
  })

  describe('FindVaccinesUseCase', () => {
    let useCase: FindVaccinesUseCase

    beforeEach(() => {
      useCase = new FindVaccinesUseCase({} as DataSource, mockRepository, mockCacheService)
      mockRepository.findAll.mockResolvedValue([[makeVaccine()], 1])
    })

    // Inativa é decisão de curadoria: some das listas de leitura.
    it('never includes inactive entries for a clinic ADMIN, even when asked', async () => {
      await useCase.execute({ page: 1, limit: 20, includeInactive: true }, clinicAdmin)

      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20, undefined, false)
    })

    it('honours includeInactive for the PLATFORM_ADMIN', async () => {
      await useCase.execute({ page: 1, limit: 20, includeInactive: true }, platformAdmin)

      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20, undefined, true)
    })

    it('serves from cache without touching the repository', async () => {
      mockCacheService.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

      const result = await useCase.execute({ page: 1, limit: 20 }, clinicAdmin)

      expect(mockRepository.findAll).not.toHaveBeenCalled()
      expect(result.total).toBe(0)
    })

    // Catálogo curado à mão muda raramente — 10 min, não os 60s de medicamentos.
    it('caches the listing for ten minutes', async () => {
      await useCase.execute({ page: 1, limit: 20 }, clinicAdmin)

      expect(mockCacheService.set).toHaveBeenCalledWith(expect.any(String), expect.anything(), 600)
    })

    it('survives a cache failure and still answers from the repository', async () => {
      mockCacheService.get.mockRejectedValue(new Error('redis down'))

      const result = await useCase.execute({ page: 1, limit: 20 }, clinicAdmin)

      expect(result.total).toBe(1)
    })
  })

  describe('GetVaccineUseCase', () => {
    let useCase: GetVaccineUseCase

    beforeEach(() => {
      useCase = new GetVaccineUseCase({} as DataSource, mockRepository, mockCacheService)
    })

    it('returns the vaccine', async () => {
      mockRepository.findById.mockResolvedValue(makeVaccine())

      const result = await useCase.execute('v1')

      expect(result.abbreviation).toBe('SCR')
    })

    it('throws NotFoundException when it does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('UpdateVaccineUseCase', () => {
    let useCase: UpdateVaccineUseCase

    beforeEach(() => {
      useCase = new UpdateVaccineUseCase({} as DataSource, mockRepository, mockCacheService)
    })

    it('updates and invalidates both the item and the listing', async () => {
      mockRepository.findById.mockResolvedValue(makeVaccine())
      mockRepository.update.mockResolvedValue(makeVaccine({ isActive: false }))

      const result = await useCase.execute('v1', { isActive: false })

      expect(result.isActive).toBe(false)
      expect(mockCacheService.del).toHaveBeenCalledWith('vaccine:v1')
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('vaccines:list*')
    })

    it('throws NotFoundException when it does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing', { name: 'X' })).rejects.toThrow(NotFoundException)
    })

    it('rejects renaming onto an existing name', async () => {
      mockRepository.findById.mockResolvedValue(makeVaccine())
      mockRepository.findByName.mockResolvedValue(makeVaccine({ id: 'other' }))

      await expect(useCase.execute('v1', { name: 'BCG' })).rejects.toThrow(ConflictException)
    })

    // Renomear para o mesmo nome, mudando só a caixa, não é colisão consigo mesmo.
    it('allows keeping the same name in a different case', async () => {
      mockRepository.findById.mockResolvedValue(makeVaccine())
      mockRepository.update.mockResolvedValue(makeVaccine())

      await expect(useCase.execute('v1', { name: 'TRÍPLICE VIRAL' })).resolves.toBeDefined()
      expect(mockRepository.findByName).not.toHaveBeenCalled()
    })
  })

  describe('DeleteVaccineUseCase', () => {
    let useCase: DeleteVaccineUseCase

    beforeEach(() => {
      useCase = new DeleteVaccineUseCase({} as DataSource, mockRepository, mockCacheService)
    })

    it('soft deletes and invalidates the caches', async () => {
      mockRepository.findById.mockResolvedValue(makeVaccine())

      await useCase.execute('v1')

      expect(mockRepository.delete).toHaveBeenCalledWith('v1')
      expect(mockCacheService.del).toHaveBeenCalledWith('vaccine:v1')
    })

    it('throws NotFoundException when it does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })
})
