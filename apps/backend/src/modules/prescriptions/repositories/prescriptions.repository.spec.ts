import { QueryRunner, Repository } from 'typeorm'
import { Prescription } from '../entities/prescription.entity'
import { PrescriptionsRepository } from './prescriptions.repository'
import { CreatePrescriptionData } from './prescriptions.repository.interface'

function makeRepo(): jest.Mocked<Repository<Prescription>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<Prescription>>
}

function makePrescriptionData(): CreatePrescriptionData {
  return {
    clinicId: 'clinic-uuid',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    snapshot: {
      issuedAt: new Date().toISOString(),
      clinic: { name: 'Clinic', address: null, logoUrl: null },
      doctor: { name: 'Doctor', crmNumber: '12345/SP', specialtyName: null },
      patient: { name: 'Patient', documentNumber: '12345678900' },
      items: [{ medicationId: 'med-uuid', name: 'Dipirona', activeIngredient: null, instructions: 'Tomar 1 cp' }],
      notes: null,
    },
    issuedAt: new Date(),
  }
}

describe('PrescriptionsRepository', () => {
  let mockRepo: jest.Mocked<Repository<Prescription>>
  let repository: PrescriptionsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new PrescriptionsRepository(mockRepo)
  })

  describe('findByAppointment', () => {
    it('queries by appointmentId and clinicId ordered by issuedAt DESC', async () => {
      mockRepo.find.mockResolvedValue([])
      await repository.findByAppointment('appt-uuid', 'clinic-uuid')
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { appointmentId: 'appt-uuid', clinicId: 'clinic-uuid' },
        order: { issuedAt: 'DESC' },
      })
    })

    it('returns an empty array when no prescriptions found', async () => {
      mockRepo.find.mockResolvedValue([])
      const result = await repository.findByAppointment('appt-uuid', 'clinic-uuid')
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('rx-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'rx-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('rx-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the prescription when found', async () => {
      const prescription = { id: 'rx-uuid' } as Prescription
      mockRepo.findOne.mockResolvedValue(prescription)
      const result = await repository.findById('rx-uuid', 'clinic-uuid')
      expect(result).toBe(prescription)
    })
  })

  describe('create', () => {
    it('creates and saves a prescription', async () => {
      const data = makePrescriptionData()
      const entity = { id: 'rx-uuid' } as Prescription
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makePrescriptionData()
      const entity = { id: 'rx-uuid' } as Prescription
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Prescription)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('rx-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('rx-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('rx-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Prescription)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('rx-uuid')
    })
  })
})
