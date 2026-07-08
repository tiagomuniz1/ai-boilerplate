import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import { MedicalRecordsRepository } from './medical-records.repository'
import { CreateMedicalRecordData } from './medical-records.repository.interface'

const mockQueryBuilder = {
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getManyAndCount: jest.fn(),
}

const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
} as unknown as jest.Mocked<Repository<MedicalRecord>>

describe('MedicalRecordsRepository', () => {
  let repository: MedicalRecordsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)
    repository = new MedicalRecordsRepository(mockRepository)
  })

  describe('findById', () => {
    it('queries with id and clinicId', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      await repository.findById('id-1', 'clinic-1')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mr.id = :id', { id: 'id-1' })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.clinicId = :clinicId', { clinicId: 'clinic-1' })
    })

    it('returns null when not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      const result = await repository.findById('id-1', 'clinic-1')
      expect(result).toBeNull()
    })
  })

  describe('findByAppointment', () => {
    it('queries by appointmentId and clinicId', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      await repository.findByAppointment('appt-1', 'clinic-1')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mr.appointmentId = :appointmentId', { appointmentId: 'appt-1' })
    })
  })

  describe('findByPatient', () => {
    it('queries by patientId with pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.patientId = :patientId', { patientId: 'patient-1' })
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0)
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20)
    })

    it('adds doctorId filter when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, 'doctor-1')
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.doctorId = :doctorId', { doctorId: 'doctor-1' })
    })

    it('skips doctorId filter when not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20)
      const andWhereCalls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
      expect(andWhereCalls).not.toContain('mr.doctorId = :doctorId')
    })
  })

  describe('create', () => {
    const makeCreateData = (): CreateMedicalRecordData => ({
      clinicId: 'clinic-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      specialtyId: 'specialty-1',
      templateId: 'template-1',
      templateSchemaSnapshot: [],
      data: {},
      notes: null,
    })

    it('saves record via own repository and reloads with joins', async () => {
      const saved = { id: 'new-id', clinicId: 'clinic-1' }
      const full = { id: 'new-id', clinicId: 'clinic-1', patient: {}, doctor: {}, specialty: {} }
      ;(mockRepository.create as jest.Mock).mockReturnValue(saved)
      ;(mockRepository.save as jest.Mock).mockResolvedValue(saved)
      mockQueryBuilder.getOne.mockResolvedValue(full)

      const result = await repository.create(makeCreateData())
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toBe(full)
    })

    it('uses queryRunner manager repository when provided', async () => {
      const saved = { id: 'new-id', clinicId: 'clinic-1' }
      const full = { id: 'new-id', patient: {}, doctor: {}, specialty: {} }
      const qrRepo = { create: jest.fn().mockReturnValue(saved), save: jest.fn().mockResolvedValue(saved) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner
      mockQueryBuilder.getOne.mockResolvedValue(full)

      await repository.create(makeCreateData(), qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.save).toHaveBeenCalled()
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('patches data and notes and reloads', async () => {
      const updated = { id: 'id-1', patient: {}, doctor: {}, specialty: {} }
      ;(mockRepository.update as jest.Mock).mockResolvedValue(undefined)
      mockQueryBuilder.getOne.mockResolvedValue(updated)

      const result = await repository.update('id-1', { data: { key: 'val' }, notes: 'new notes' }, 'clinic-1')
      expect(mockRepository.update).toHaveBeenCalledWith('id-1', { data: { key: 'val' }, notes: 'new notes' })
      expect(result).toBe(updated)
    })

    it('skips undefined fields in patch', async () => {
      const updated = { id: 'id-1', patient: {}, doctor: {}, specialty: {} }
      ;(mockRepository.update as jest.Mock).mockResolvedValue(undefined)
      mockQueryBuilder.getOne.mockResolvedValue(updated)

      await repository.update('id-1', {}, 'clinic-1')
      expect(mockRepository.update).toHaveBeenCalledWith('id-1', {})
    })

    it('uses queryRunner manager repository when provided', async () => {
      const full = { id: 'id-1', patient: {}, doctor: {}, specialty: {} }
      const qrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner
      mockQueryBuilder.getOne.mockResolvedValue(full)

      await repository.update('id-1', { notes: 'x' }, 'clinic-1', qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.update).toHaveBeenCalled()
      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the record via own repository', async () => {
      ;(mockRepository.softDelete as jest.Mock).mockResolvedValue(undefined)
      await repository.delete('id-1', 'clinic-1')
      expect(mockRepository.softDelete).toHaveBeenCalledWith('id-1')
    })

    it('uses queryRunner manager repository when provided', async () => {
      const qrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner

      await repository.delete('id-1', 'clinic-1', qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.softDelete).toHaveBeenCalledWith('id-1')
      expect(mockRepository.softDelete).not.toHaveBeenCalled()
    })
  })
})
