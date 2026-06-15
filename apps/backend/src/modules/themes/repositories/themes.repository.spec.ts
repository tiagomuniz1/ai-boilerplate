import { Repository } from 'typeorm'
import { faker } from '@faker-js/faker'
import { Theme } from '../entities/theme.entity'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { ThemesRepository } from './themes.repository'

function makeQbMock() {
  const qb: any = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  }
  return qb
}

function makeThemeRepo(): jest.Mocked<Repository<Theme>> {
  return {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Theme>>
}

function makeClinicRepo(): jest.Mocked<Repository<Clinic>> {
  return {
    findOneBy: jest.fn(),
    countBy: jest.fn(),
  } as unknown as jest.Mocked<Repository<Clinic>>
}

function makeTheme(overrides = {}): Theme {
  return {
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
  } as Theme
}

describe('ThemesRepository', () => {
  let themeRepo: jest.Mocked<Repository<Theme>>
  let clinicRepo: jest.Mocked<Repository<Clinic>>
  let repository: ThemesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    themeRepo = makeThemeRepo()
    clinicRepo = makeClinicRepo()
    repository = new ThemesRepository(themeRepo, clinicRepo)
  })

  describe('findAll', () => {
    it('returns paginated themes ordered by isDefault desc then name asc', async () => {
      const themes = [makeTheme({ isDefault: true }), makeTheme()]
      themeRepo.findAndCount.mockResolvedValue([themes, 2])

      const result = await repository.findAll(1, 20)

      expect(themeRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        order: { isDefault: 'DESC', name: 'ASC' },
      })
      expect(result).toEqual([themes, 2])
    })

    it('calculates correct skip offset for page 2', async () => {
      themeRepo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(2, 10)

      expect(themeRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      )
    })
  })

  describe('findById', () => {
    it('delegates to findOneBy with id', async () => {
      const theme = makeTheme()
      themeRepo.findOneBy.mockResolvedValue(theme)

      const result = await repository.findById(theme.id)

      expect(themeRepo.findOneBy).toHaveBeenCalledWith({ id: theme.id })
      expect(result).toBe(theme)
    })

    it('returns null when not found', async () => {
      themeRepo.findOneBy.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findBySlug', () => {
    it('delegates to findOneBy with slug', async () => {
      const theme = makeTheme()
      themeRepo.findOneBy.mockResolvedValue(theme)

      const result = await repository.findBySlug('teal-moderno')

      expect(themeRepo.findOneBy).toHaveBeenCalledWith({ slug: 'teal-moderno' })
      expect(result).toBe(theme)
    })

    it('returns null when not found', async () => {
      themeRepo.findOneBy.mockResolvedValue(null)

      expect(await repository.findBySlug('missing')).toBeNull()
    })
  })

  describe('findDefault', () => {
    it('returns the theme with isDefault=true', async () => {
      const theme = makeTheme({ isDefault: true })
      themeRepo.findOneBy.mockResolvedValue(theme)

      const result = await repository.findDefault()

      expect(themeRepo.findOneBy).toHaveBeenCalledWith({ isDefault: true })
      expect(result?.isDefault).toBe(true)
    })

    it('returns null when no default theme exists', async () => {
      themeRepo.findOneBy.mockResolvedValue(null)

      expect(await repository.findDefault()).toBeNull()
    })
  })

  describe('findByClinicId', () => {
    it('returns null when clinic does not have a themeId', async () => {
      clinicRepo.findOneBy.mockResolvedValue({ id: 'clinic-uuid', themeId: null } as any)

      const result = await repository.findByClinicId('clinic-uuid')

      expect(result).toBeNull()
      expect(themeRepo.findOneBy).not.toHaveBeenCalled()
    })

    it('returns null when clinic is not found', async () => {
      clinicRepo.findOneBy.mockResolvedValue(null)

      const result = await repository.findByClinicId('missing-clinic')

      expect(result).toBeNull()
      expect(themeRepo.findOneBy).not.toHaveBeenCalled()
    })

    it('returns theme when clinic has a themeId', async () => {
      const theme = makeTheme()
      clinicRepo.findOneBy.mockResolvedValue({ id: 'clinic-uuid', themeId: theme.id } as any)
      themeRepo.findOneBy.mockResolvedValue(theme)

      const result = await repository.findByClinicId('clinic-uuid')

      expect(themeRepo.findOneBy).toHaveBeenCalledWith({ id: theme.id })
      expect(result).toBe(theme)
    })
  })

  describe('countClinicsByThemeId', () => {
    it('delegates to clinicRepo.countBy', async () => {
      clinicRepo.countBy.mockResolvedValue(3)

      const result = await repository.countClinicsByThemeId('theme-uuid')

      expect(clinicRepo.countBy).toHaveBeenCalledWith({ themeId: 'theme-uuid' })
      expect(result).toBe(3)
    })
  })

  describe('clearDefaultExcept', () => {
    it('updates all themes except the excluded id to isDefault=false', async () => {
      const qb = makeQbMock()
      themeRepo.createQueryBuilder.mockReturnValue(qb)

      await repository.clearDefaultExcept('exclude-uuid')

      expect(qb.update).toHaveBeenCalledWith(Theme)
      expect(qb.set).toHaveBeenCalledWith({ isDefault: false })
      expect(qb.where).toHaveBeenCalledWith(
        'id != :excludeId AND is_default = true',
        { excludeId: 'exclude-uuid' },
      )
      expect(qb.execute).toHaveBeenCalled()
    })

    it('uses queryRunner repo when queryRunner is provided', async () => {
      const qb = makeQbMock()
      const qrRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.clearDefaultExcept('exclude-uuid', queryRunner)

      expect(qrRepo.createQueryBuilder).toHaveBeenCalled()
      expect(themeRepo.createQueryBuilder).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('creates and saves theme when no queryRunner', async () => {
      const data = { name: 'Teal', slug: 'teal', isDefault: false, accentColor: '#0D9488', accentSoftColor: '#CCFBF1' }
      const theme = makeTheme()
      themeRepo.create.mockReturnValue(theme)
      themeRepo.save.mockResolvedValue(theme)

      const result = await repository.create(data)

      expect(themeRepo.create).toHaveBeenCalledWith(data)
      expect(themeRepo.save).toHaveBeenCalledWith(theme)
      expect(result).toBe(theme)
    })

    it('uses queryRunner manager repo when queryRunner is provided', async () => {
      const data = { name: 'Teal', slug: 'teal', isDefault: false, accentColor: '#0D9488', accentSoftColor: '#CCFBF1' }
      const theme = makeTheme()
      const qrRepo = {
        create: jest.fn().mockReturnValue(theme),
        save: jest.fn().mockResolvedValue(theme),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create(data, queryRunner)

      expect(qrRepo.create).toHaveBeenCalledWith(data)
      expect(qrRepo.save).toHaveBeenCalledWith(theme)
      expect(themeRepo.create).not.toHaveBeenCalled()
      expect(result).toBe(theme)
    })
  })

  describe('update', () => {
    it('loads by id, merges fields, and saves', async () => {
      const theme = makeTheme()
      const updated = makeTheme({ id: theme.id, name: 'Updated Name' })
      themeRepo.findOneByOrFail.mockResolvedValue(theme)
      themeRepo.save.mockResolvedValue(updated)

      const result = await repository.update(theme.id, { name: 'Updated Name' })

      expect(themeRepo.findOneByOrFail).toHaveBeenCalledWith({ id: theme.id })
      expect(themeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Name' }))
      expect(result).toBe(updated)
    })

    it('uses queryRunner repo when queryRunner is provided', async () => {
      const theme = makeTheme()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue(theme),
        save: jest.fn().mockResolvedValue(theme),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update(theme.id, { name: 'Updated' }, queryRunner)

      expect(qrRepo.findOneByOrFail).toHaveBeenCalledWith({ id: theme.id })
      expect(themeRepo.findOneByOrFail).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft-deletes theme when no queryRunner', async () => {
      themeRepo.softDelete.mockResolvedValue(undefined as any)

      await repository.delete('theme-uuid')

      expect(themeRepo.softDelete).toHaveBeenCalledWith('theme-uuid')
    })

    it('uses queryRunner manager repo when queryRunner is provided', async () => {
      const qrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('theme-uuid', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith('theme-uuid')
      expect(themeRepo.softDelete).not.toHaveBeenCalled()
    })
  })
})
