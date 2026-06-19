import { faker } from '@faker-js/faker'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'
import { ClinicSpecialtiesRepository } from './clinic-specialties.repository'

const makeRecord = (overrides = {}): ClinicSpecialty =>
  ({
    id: faker.string.uuid(),
    clinicId: faker.string.uuid(),
    specialtyId: faker.string.uuid(),
    createdAt: new Date(),
    specialty: { name: 'Cardiologia', description: null },
    ...overrides,
  } as unknown as ClinicSpecialty)

const makeQueryBuilder = () => {
  const qb: any = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
  return qb
}

const mockRepository = {
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
}

describe('ClinicSpecialtiesRepository', () => {
  let repository: ClinicSpecialtiesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new ClinicSpecialtiesRepository(mockRepository as any)
  })

  describe('findByClinicId', () => {
    it('returns paginated clinic specialties without search', async () => {
      const clinicId = faker.string.uuid()
      const records = [makeRecord({ clinicId })]
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([records, 1])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByClinicId(clinicId, 1, 20)

      expect(qb.where).toHaveBeenCalledWith('cs.clinicId = :clinicId', { clinicId })
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.andWhere).not.toHaveBeenCalled()
      expect(result).toEqual([records, 1])
    })

    it('applies ILIKE search filter when search is provided', async () => {
      const clinicId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findByClinicId(clinicId, 1, 20, 'cardio')

      expect(qb.andWhere).toHaveBeenCalledWith('specialty.name ILIKE :search', { search: '%cardio%' })
    })

    it('applies correct pagination offset for page 2', async () => {
      const clinicId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findByClinicId(clinicId, 2, 10)

      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  describe('findByClinicAndSpecialty', () => {
    it('returns record when found', async () => {
      const record = makeRecord()
      mockRepository.findOneBy.mockResolvedValue(record)

      const result = await repository.findByClinicAndSpecialty(record.clinicId, record.specialtyId)

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        clinicId: record.clinicId,
        specialtyId: record.specialtyId,
      })
      expect(result).toBe(record)
    })

    it('returns null when not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null)

      const result = await repository.findByClinicAndSpecialty(faker.string.uuid(), faker.string.uuid())

      expect(result).toBeNull()
    })
  })

  describe('link', () => {
    it('creates and saves record without queryRunner', async () => {
      const clinicId = faker.string.uuid()
      const specialtyId = faker.string.uuid()
      const record = makeRecord({ clinicId, specialtyId })
      mockRepository.create.mockReturnValue(record)
      mockRepository.save.mockResolvedValue(record)

      const result = await repository.link(clinicId, specialtyId)

      expect(mockRepository.create).toHaveBeenCalledWith({ clinicId, specialtyId })
      expect(mockRepository.save).toHaveBeenCalledWith(record)
      expect(result).toBe(record)
    })

    it('uses queryRunner repo when provided', async () => {
      const clinicId = faker.string.uuid()
      const specialtyId = faker.string.uuid()
      const record = makeRecord({ clinicId, specialtyId })
      const qrRepo = { create: jest.fn().mockReturnValue(record), save: jest.fn().mockResolvedValue(record) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.link(clinicId, specialtyId, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ClinicSpecialty)
      expect(qrRepo.create).toHaveBeenCalledWith({ clinicId, specialtyId })
      expect(result).toBe(record)
    })
  })

  describe('unlink', () => {
    it('deletes record by id without queryRunner', async () => {
      const id = faker.string.uuid()
      mockRepository.delete.mockResolvedValue({ affected: 1 })

      await repository.unlink(id)

      expect(mockRepository.delete).toHaveBeenCalledWith(id)
    })

    it('uses queryRunner repo when provided', async () => {
      const id = faker.string.uuid()
      const qrRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.unlink(id, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ClinicSpecialty)
      expect(qrRepo.delete).toHaveBeenCalledWith(id)
    })
  })
})
