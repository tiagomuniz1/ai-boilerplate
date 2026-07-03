import { QueryRunner, Repository } from 'typeorm'
import { PrescriptionTemplate } from '../entities/prescription-template.entity'
import { PrescriptionTemplatesRepository } from './prescription-templates.repository'
import { CreatePrescriptionTemplateData } from './prescription-templates.repository.interface'

function makeRepo(): jest.Mocked<Repository<PrescriptionTemplate>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<PrescriptionTemplate>>
}

function makeTemplateData(): CreatePrescriptionTemplateData {
  return {
    clinicId: 'clinic-uuid',
    doctorId: 'doctor-uuid',
    doctorName: 'Dr. House',
    name: 'Modelo A',
    items: [{ medicationId: 'med-uuid', name: 'Dipirona', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp' }],
    notes: null,
  }
}

describe('PrescriptionTemplatesRepository', () => {
  let mockRepo: jest.Mocked<Repository<PrescriptionTemplate>>
  let repository: PrescriptionTemplatesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new PrescriptionTemplatesRepository(mockRepo)
  })

  describe('findAll', () => {
    it('queries by clinicId and isActive without doctorId filter', async () => {
      mockRepo.find.mockResolvedValue([])
      await repository.findAll('clinic-uuid')
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-uuid', isActive: true },
        order: { createdAt: 'DESC' },
      })
    })

    it('adds doctorId to the where clause when provided', async () => {
      mockRepo.find.mockResolvedValue([])
      await repository.findAll('clinic-uuid', 'doctor-uuid')
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-uuid', isActive: true, doctorId: 'doctor-uuid' },
        order: { createdAt: 'DESC' },
      })
    })

    it('returns an empty array when no templates found', async () => {
      mockRepo.find.mockResolvedValue([])
      const result = await repository.findAll('clinic-uuid')
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('tpl-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tpl-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('tpl-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the template when found', async () => {
      const template = { id: 'tpl-uuid' } as PrescriptionTemplate
      mockRepo.findOne.mockResolvedValue(template)
      const result = await repository.findById('tpl-uuid', 'clinic-uuid')
      expect(result).toBe(template)
    })
  })

  describe('create', () => {
    it('creates and saves a template', async () => {
      const data = makeTemplateData()
      const entity = { id: 'tpl-uuid' } as PrescriptionTemplate
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makeTemplateData()
      const entity = { id: 'tpl-uuid' } as PrescriptionTemplate
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(PrescriptionTemplate)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('update', () => {
    it('updates and refetches the template', async () => {
      const entity = { id: 'tpl-uuid', name: 'Novo nome' } as PrescriptionTemplate
      mockRepo.update.mockResolvedValue(undefined as any)
      mockRepo.findOneOrFail.mockResolvedValue(entity)

      const result = await repository.update('tpl-uuid', { name: 'Novo nome' })

      expect(mockRepo.update).toHaveBeenCalledWith('tpl-uuid', { name: 'Novo nome' })
      expect(mockRepo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'tpl-uuid' } })
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const entity = { id: 'tpl-uuid' } as PrescriptionTemplate
      const mockQrRepo = {
        update: jest.fn().mockResolvedValue(undefined),
        findOneOrFail: jest.fn().mockResolvedValue(entity),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      const result = await repository.update('tpl-uuid', { name: 'Novo nome' }, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(PrescriptionTemplate)
      expect(mockQrRepo.update).toHaveBeenCalledWith('tpl-uuid', { name: 'Novo nome' })
      expect(result).toBe(entity)
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('tpl-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('tpl-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('tpl-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(PrescriptionTemplate)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('tpl-uuid')
    })
  })
})
