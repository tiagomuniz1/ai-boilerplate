import { ILike, Repository } from 'typeorm'
import { faker } from '@faker-js/faker'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Specialty } from '../entities/specialty.entity'
import { SpecialtiesRepository } from './specialties.repository'

function makeRepo(): jest.Mocked<Repository<Specialty>> {
  return {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    findBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  } as unknown as jest.Mocked<Repository<Specialty>>
}

function makeSpecialty(overrides = {}): Specialty {
  return {
    id: faker.string.uuid(),
    name: 'Cardiologia',
    description: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Specialty
}

describe('SpecialtiesRepository', () => {
  let repo: jest.Mocked<Repository<Specialty>>
  let repository: SpecialtiesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new SpecialtiesRepository(repo)
  })

  describe('findAll', () => {
    it('returns paginated results without search', async () => {
      const specialties = [makeSpecialty()]
      repo.findAndCount.mockResolvedValue([specialties, 1])

      const result = await repository.findAll(2, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 10,
          take: 10,
          order: { createdAt: 'DESC' },
        }),
      )
      expect(result).toEqual([specialties, 1])
    })

    it('applies ILike filter on name when search is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, 'Cardio')

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: ILike('%Cardio%') },
        }),
      )
    })

    it('does not apply filter when search is undefined', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, undefined)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      )
    })

    it('calculates correct skip for pagination', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(3, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      )
    })
  })

  describe('findById', () => {
    it('returns specialty when found', async () => {
      const specialty = makeSpecialty()
      repo.findOneBy.mockResolvedValue(specialty)

      const result = await repository.findById(specialty.id)

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: specialty.id })
      expect(result).toBe(specialty)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      const result = await repository.findById(faker.string.uuid())

      expect(result).toBeNull()
    })
  })

  describe('findByName', () => {
    it('returns specialty when found (case-insensitive)', async () => {
      const specialty = makeSpecialty()
      repo.findOneBy.mockResolvedValue(specialty)

      const result = await repository.findByName('cardiologia')

      expect(repo.findOneBy).toHaveBeenCalledWith({ name: ILike('cardiologia') })
      expect(result).toBe(specialty)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      const result = await repository.findByName('Unknown')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and saves a specialty', async () => {
      const specialty = makeSpecialty()
      repo.create.mockReturnValue(specialty)
      repo.save.mockResolvedValue(specialty)

      const dto = { name: 'Cardiologia' }
      const result = await repository.create(dto as any)

      expect(repo.create).toHaveBeenCalledWith(dto)
      expect(repo.save).toHaveBeenCalledWith(specialty)
      expect(result).toBe(specialty)
    })

    it('uses queryRunner repo when provided', async () => {
      const specialty = makeSpecialty()
      const qrRepo = {
        create: jest.fn().mockReturnValue(specialty),
        save: jest.fn().mockResolvedValue(specialty),
      }
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      }

      const dto = { name: 'Cardiologia' }
      const result = await repository.create(dto as any, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Specialty)
      expect(result).toBe(specialty)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads specialty, merges data, and saves', async () => {
      const specialty = makeSpecialty()
      const mutable = { ...specialty }
      repo.findOneByOrFail.mockResolvedValue(mutable as any)
      repo.save.mockResolvedValue({ ...mutable, name: 'Neurologia' } as any)

      const result = await repository.update(specialty.id, { name: 'Neurologia' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: specialty.id })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neurologia' }))
      expect(result.name).toBe('Neurologia')
    })

    it('allows null to clear description', async () => {
      const specialty = makeSpecialty({ description: 'Old description' })
      const mutable = { ...specialty }
      repo.findOneByOrFail.mockResolvedValue(mutable as any)
      repo.save.mockResolvedValue({ ...mutable, description: null } as any)

      await repository.update(specialty.id, { description: null })

      expect(mutable.description).toBeNull()
    })

    it('uses queryRunner repo when provided', async () => {
      const specialty = makeSpecialty()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...specialty }),
        save: jest.fn().mockResolvedValue(specialty),
      }
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      }

      const result = await repository.update(specialty.id, { name: 'Neurologia' }, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Specialty)
      expect(result).toBe(specialty)
      expect(repo.findOneByOrFail).not.toHaveBeenCalled()
    })
  })

  describe('findByIds', () => {
    it('returns matching specialties using findBy with In operator', async () => {
      const specialty = makeSpecialty()
      repo.findBy.mockResolvedValue([specialty])

      const result = await repository.findByIds([specialty.id])

      expect(repo.findBy).toHaveBeenCalledWith({ id: expect.anything() })
      expect(result).toEqual([specialty])
    })

    it('returns empty array without calling findBy when ids is empty', async () => {
      const result = await repository.findByIds([])

      expect(repo.findBy).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('returns multiple specialties for multiple ids', async () => {
      const s1 = makeSpecialty({ id: 'id-1', name: 'Cardiologia' })
      const s2 = makeSpecialty({ id: 'id-2', name: 'Neurologia' })
      repo.findBy.mockResolvedValue([s1, s2])

      const result = await repository.findByIds(['id-1', 'id-2'])

      expect(result).toHaveLength(2)
    })
  })

  describe('countLinkedDoctors', () => {
    it('returns the count of doctors linked to the specialty', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedDoctors('uuid-1')

      expect((repo.manager as any).createQueryBuilder).toHaveBeenCalledWith(Doctor, 'doctor')
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('doctor.doctorSpecialties', 'doctorSpecialty')
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('doctorSpecialty.specialty', 'specialty')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('specialty.id = :id', { id: 'uuid-1' })
      expect(result).toBe(2)
    })

    it('returns zero when no doctors are linked', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedDoctors('uuid-unlinked')

      expect(result).toBe(0)
    })
  })

  describe('countLinkedClinics', () => {
    it('counts clinic_specialties rows for the specialty', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedClinics('uuid-1')

      expect(mockQueryBuilder.from).toHaveBeenCalledWith('clinic_specialties', 'cs')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cs.specialty_id = :id', { id: 'uuid-1' })
      expect(result).toBe(3)
    })
  })

  describe('countLinkedClinicsForAll', () => {
    it('returns empty record when ids is empty without querying the database', async () => {
      const result = await repository.countLinkedClinicsForAll([])

      expect(result).toEqual({})
    })

    it('returns map of specialty_id to clinic count', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { specialty_id: 'uuid-1', count: '3' },
          { specialty_id: 'uuid-2', count: '1' },
        ]),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedClinicsForAll(['uuid-1', 'uuid-2'])

      expect(mockQueryBuilder.from).toHaveBeenCalledWith('clinic_specialties', 'cs')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cs.specialty_id IN (:...ids)', { ids: ['uuid-1', 'uuid-2'] })
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('cs.specialty_id')
      expect(result).toEqual({ 'uuid-1': 3, 'uuid-2': 1 })
    })

    it('returns 0 for specialties without linked clinics (absent from result)', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedClinicsForAll(['uuid-no-clinics'])

      expect(result).toEqual({})
    })
  })

  describe('countLinkedAppointments', () => {
    it('counts appointments rows for the specialty', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      }
      ;(repo.manager as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)

      const result = await repository.countLinkedAppointments('uuid-1')

      expect(mockQueryBuilder.from).toHaveBeenCalledWith('appointments', 'appointment')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('appointment.specialty_id = :id', {
        id: 'uuid-1',
      })
      expect(result).toBe(5)
    })
  })

  describe('delete', () => {
    it('soft-deletes the specialty', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 } as any)

      await repository.delete('uuid-1')

      expect(repo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repo when provided', async () => {
      const qrRepo = { softDelete: jest.fn().mockResolvedValue({ affected: 1 }) }
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      }

      await repository.delete('uuid-1', queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Specialty)
      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })
})
