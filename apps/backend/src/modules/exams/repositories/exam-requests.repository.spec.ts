import { QueryRunner, Repository } from 'typeorm'
import { ExamRequestStatus } from '@app/shared'
import { ExamRequest } from '../entities/exam-request.entity'
import { ExamRequestsRepository } from './exam-requests.repository'
import { CreateExamRequestData } from './exam-requests.repository.interface'

function makeRepo(): jest.Mocked<Repository<ExamRequest>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<ExamRequest>>
}

function makeExamRequestData(): CreateExamRequestData {
  return {
    clinicId: 'clinic-uuid',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    snapshot: {
      issuedAt: new Date().toISOString(),
      clinic: { name: 'Clinic', address: null, logoUrl: null },
      doctor: { name: 'Doctor', crmNumber: '12345/SP', rqe: null, specialtyName: null },
      patient: { name: 'Patient', documentNumber: '12345678900' },
      items: [{ name: 'Hemograma', observations: null }],
      notes: null,
    },
    issuedAt: new Date(),
  }
}

describe('ExamRequestsRepository', () => {
  let mockRepo: jest.Mocked<Repository<ExamRequest>>
  let repository: ExamRequestsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new ExamRequestsRepository(mockRepo)
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

    it('returns an empty array when no exam requests found', async () => {
      mockRepo.find.mockResolvedValue([])
      const result = await repository.findByAppointment('appt-uuid', 'clinic-uuid')
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('exam-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'exam-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('exam-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the exam request when found', async () => {
      const examRequest = { id: 'exam-uuid' } as ExamRequest
      mockRepo.findOne.mockResolvedValue(examRequest)
      const result = await repository.findById('exam-uuid', 'clinic-uuid')
      expect(result).toBe(examRequest)
    })
  })

  describe('create', () => {
    it('creates and saves an exam request', async () => {
      const data = makeExamRequestData()
      const entity = { id: 'exam-uuid' } as ExamRequest
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makeExamRequestData()
      const entity = { id: 'exam-uuid' } as ExamRequest
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamRequest)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('updateStatus', () => {
    it('updates the status column', async () => {
      mockRepo.update.mockResolvedValue(undefined as any)
      await repository.updateStatus('exam-uuid', ExamRequestStatus.COMPLETED)
      expect(mockRepo.update).toHaveBeenCalledWith('exam-uuid', { status: ExamRequestStatus.COMPLETED })
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.updateStatus('exam-uuid', ExamRequestStatus.COMPLETED, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamRequest)
      expect(mockQrRepo.update).toHaveBeenCalledWith('exam-uuid', { status: ExamRequestStatus.COMPLETED })
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('exam-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('exam-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('exam-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ExamRequest)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('exam-uuid')
    })
  })
})
