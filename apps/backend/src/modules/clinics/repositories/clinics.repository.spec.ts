import { ILike, Repository } from 'typeorm'
import { ClinicsRepository } from './clinics.repository'
import { Clinic } from '../entities/clinic.entity'

function makeQueryBuilderMock(overrides: { result?: any } = {}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(overrides.result ?? [[], 0]),
  }
  return qb
}

function makeRepo(): jest.Mocked<Repository<Clinic>> {
  const managerRepo = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  }
  return {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      getRepository: jest.fn().mockReturnValue(managerRepo),
      _managerRepo: managerRepo,
    },
  } as unknown as jest.Mocked<Repository<Clinic>>
}

function makeClinic(overrides = {}): Clinic {
  return {
    id: 'clinic-uuid-1',
    name: 'Clínica do Coração',
    slug: 'clinica-do-coracao',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Clinic
}

describe('ClinicsRepository', () => {
  let repo: jest.Mocked<Repository<Clinic>>
  let repository: ClinicsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new ClinicsRepository(repo)
  })

  describe('findAll', () => {
    it('uses findAndCount with correct pagination when search is absent', async () => {
      const clinics = [makeClinic()]
      repo.findAndCount.mockResolvedValue([clinics, 1])

      const result = await repository.findAll(1, 20)

      expect(repo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      })
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
      expect(result).toEqual([clinics, 1])
    })

    it('calculates correct skip offset for pagination without search', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(3, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      )
    })

    it('uses QueryBuilder with ILIKE on name and slug when search is provided', async () => {
      const clinics = [makeClinic()]
      const qb = makeQueryBuilderMock({ result: [clinics, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(1, 20, 'coracao')

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('clinic')
      expect(qb.where).toHaveBeenCalledWith(
        'clinic.name ILIKE :search OR clinic.slug ILIKE :search',
        { search: '%coracao%' },
      )
      expect(qb.orderBy).toHaveBeenCalledWith('clinic.createdAt', 'DESC')
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(result).toEqual([clinics, 1])
    })

    it('calculates correct skip offset for pagination with search', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll(3, 10, 'test')

      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  describe('findById', () => {
    it('delegates to findOneBy with id', async () => {
      const clinic = makeClinic()
      repo.findOneBy.mockResolvedValue(clinic)

      const result = await repository.findById('clinic-uuid-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'clinic-uuid-1' })
      expect(result).toBe(clinic)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findBySlug', () => {
    it('delegates to findOneBy with ILike for case-insensitive match', async () => {
      const clinic = makeClinic()
      repo.findOneBy.mockResolvedValue(clinic)

      const result = await repository.findBySlug('clinica-do-coracao')

      expect(repo.findOneBy).toHaveBeenCalledWith({ slug: ILike('clinica-do-coracao') })
      expect(result).toBe(clinic)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findBySlug('missing')).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and saves using the repository when no queryRunner', async () => {
      const data = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
      const entity = makeClinic()
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith({ ...data, themeId: null })
      expect(repo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('spreads address fields into entity when address is provided with complement', async () => {
      const data = {
        name: 'Clínica Test',
        slug: 'clinica-test',
        address: {
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 1',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'BR',
        },
      }
      const entity = makeClinic()
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      await repository.create(data)

      const createdWith = repo.create.mock.calls[0][0] as any
      expect(createdWith.addressStreet).toBe('Rua das Flores')
      expect(createdWith.addressNumber).toBe('123')
      expect(createdWith.addressComplement).toBe('Apto 1')
    })

    it('defaults addressComplement to null when complement is not provided', async () => {
      const data = {
        name: 'Clínica Test',
        slug: 'clinica-test',
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'BR',
        },
      }
      const entity = makeClinic()
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      await repository.create(data)

      const createdWith = repo.create.mock.calls[0][0] as any
      expect(createdWith.addressComplement).toBeNull()
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { name: 'Clínica Test', slug: 'clinica-test' }
      const entity = makeClinic()
      const qrRepo = {
        create: jest.fn().mockReturnValue(entity),
        save: jest.fn().mockResolvedValue(entity),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create(data, queryRunner)

      expect(qrRepo.create).toHaveBeenCalledWith({ ...data, themeId: null })
      expect(qrRepo.save).toHaveBeenCalledWith(entity)
      expect(repo.create).not.toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
      expect(result).toBe(entity)
    })
  })

  describe('update', () => {
    it('loads clinic via findOneByOrFail, merges data, and saves', async () => {
      const clinic = makeClinic()
      const updated = makeClinic({ name: 'Clínica Nova' })
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(updated)

      const result = await repository.update('clinic-uuid-1', { name: 'Clínica Nova' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: 'clinic-uuid-1' })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Clínica Nova' }))
      expect(result).toBe(updated)
    })

    it('merges all provided fields into the entity', async () => {
      const clinic = makeClinic()
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(clinic)

      await repository.update('clinic-uuid-1', { name: 'New Name', isActive: false })

      const savedArg = repo.save.mock.calls[0][0]
      expect(savedArg.name).toBe('New Name')
      expect(savedArg.isActive).toBe(false)
    })

    it('maps address fields onto entity when address is provided', async () => {
      const clinic = makeClinic()
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(clinic)

      await repository.update('clinic-uuid-1', {
        address: {
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Apto 42',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'BR',
        },
      })

      const savedArg = repo.save.mock.calls[0][0]
      expect(savedArg.addressStreet).toBe('Av. Paulista')
      expect(savedArg.addressNumber).toBe('1000')
      expect(savedArg.addressComplement).toBe('Apto 42')
      expect(savedArg.addressNeighborhood).toBe('Bela Vista')
      expect(savedArg.addressCity).toBe('São Paulo')
      expect(savedArg.addressState).toBe('SP')
      expect(savedArg.addressZipCode).toBe('01310-100')
      expect(savedArg.addressCountry).toBe('BR')
    })

    it('uses null for complement when not provided in address', async () => {
      const clinic = makeClinic()
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(clinic)

      await repository.update('clinic-uuid-1', {
        address: {
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'BR',
        },
      })

      const savedArg = repo.save.mock.calls[0][0]
      expect(savedArg.addressComplement).toBeNull()
    })

    it('throws when clinic is not found', async () => {
      repo.findOneByOrFail.mockRejectedValue(new Error('Entity not found'))

      await expect(repository.update('missing', { name: 'X' })).rejects.toThrow()
    })

    it('sets themeId when themeId key is present in data', async () => {
      const clinic = makeClinic()
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(makeClinic({ themeId: 'theme-uuid' }))

      await repository.update('clinic-uuid-1', { themeId: 'theme-uuid' } as any)

      const savedArg = repo.save.mock.calls[0][0] as any
      expect(savedArg.themeId).toBe('theme-uuid')
    })

    it('sets themeId to null when themeId is null in data', async () => {
      const clinic = makeClinic({ themeId: 'old-theme' })
      repo.findOneByOrFail.mockResolvedValue(clinic)
      repo.save.mockResolvedValue(makeClinic({ themeId: null }))

      await repository.update('clinic-uuid-1', { themeId: null } as any)

      const savedArg = repo.save.mock.calls[0][0] as any
      expect(savedArg.themeId).toBeNull()
    })
  })

  describe('updateLogo', () => {
    it('calls repo.update with logoPath when no queryRunner', async () => {
      repo.update.mockResolvedValue(undefined as any)

      await repository.updateLogo('clinic-uuid-1', 'clinics/clinic-uuid-1/logo.jpg')

      expect(repo.update).toHaveBeenCalledWith('clinic-uuid-1', { logoPath: 'clinics/clinic-uuid-1/logo.jpg' })
    })

    it('calls queryRunner manager repo.update when queryRunner is provided', async () => {
      const qrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.updateLogo('clinic-uuid-1', 'clinics/clinic-uuid-1/logo.jpg', queryRunner)

      expect(qrRepo.update).toHaveBeenCalledWith('clinic-uuid-1', { logoPath: 'clinics/clinic-uuid-1/logo.jpg' })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('updateLogoDark', () => {
    it('calls repo.update with logoDarkPath when no queryRunner', async () => {
      repo.update.mockResolvedValue(undefined as any)

      await repository.updateLogoDark('clinic-uuid-1', 'clinics/clinic-uuid-1/logo-dark.jpg')

      expect(repo.update).toHaveBeenCalledWith('clinic-uuid-1', { logoDarkPath: 'clinics/clinic-uuid-1/logo-dark.jpg' })
    })

    it('calls queryRunner manager repo.update when queryRunner is provided', async () => {
      const qrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.updateLogoDark('clinic-uuid-1', 'clinics/clinic-uuid-1/logo-dark.jpg', queryRunner)

      expect(qrRepo.update).toHaveBeenCalledWith('clinic-uuid-1', { logoDarkPath: 'clinics/clinic-uuid-1/logo-dark.jpg' })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('updateFavicon', () => {
    it('calls repo.update with faviconPath when no queryRunner', async () => {
      repo.update.mockResolvedValue(undefined as any)

      await repository.updateFavicon('clinic-uuid-1', 'clinics/clinic-uuid-1/favicon.ico')

      expect(repo.update).toHaveBeenCalledWith('clinic-uuid-1', { faviconPath: 'clinics/clinic-uuid-1/favicon.ico' })
    })

    it('calls queryRunner manager repo.update when queryRunner is provided', async () => {
      const qrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.updateFavicon('clinic-uuid-1', 'clinics/clinic-uuid-1/favicon.ico', queryRunner)

      expect(qrRepo.update).toHaveBeenCalledWith('clinic-uuid-1', { faviconPath: 'clinics/clinic-uuid-1/favicon.ico' })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })
})
