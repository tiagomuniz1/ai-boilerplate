import { QueryRunner, Repository } from 'typeorm'
import { MedicalCertificateType } from '@app/shared'
import { MedicalCertificate } from '../entities/medical-certificate.entity'
import { MedicalCertificatesRepository } from './medical-certificates.repository'
import { CreateMedicalCertificateData } from './medical-certificates.repository.interface'

function makeRepo(): jest.Mocked<Repository<MedicalCertificate>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<MedicalCertificate>>
}

function makeCertificateData(): CreateMedicalCertificateData {
  return {
    clinicId: 'clinic-uuid',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    snapshot: {
      issuedAt: new Date().toISOString(),
      type: MedicalCertificateType.LEAVE,
      clinic: { name: 'Clinic', address: null, logoUrl: null },
      doctor: { name: 'Doctor', crmNumber: '12345/SP', rqe: null, specialtyName: null },
      patient: { name: 'Patient', documentNumber: '12345678900' },
      daysOff: 3,
      startDate: '2026-01-05',
      cidCode: null,
      attendanceDate: null,
      checkInTime: null,
      checkOutTime: null,
      observations: null,
    },
    issuedAt: new Date(),
  }
}

describe('MedicalCertificatesRepository', () => {
  let mockRepo: jest.Mocked<Repository<MedicalCertificate>>
  let repository: MedicalCertificatesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new MedicalCertificatesRepository(mockRepo)
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

    it('returns an empty array when no certificates found', async () => {
      mockRepo.find.mockResolvedValue([])
      const result = await repository.findByAppointment('appt-uuid', 'clinic-uuid')
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('cert-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'cert-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('cert-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the certificate when found', async () => {
      const certificate = { id: 'cert-uuid' } as MedicalCertificate
      mockRepo.findOne.mockResolvedValue(certificate)
      const result = await repository.findById('cert-uuid', 'clinic-uuid')
      expect(result).toBe(certificate)
    })
  })

  describe('create', () => {
    it('creates and saves a certificate', async () => {
      const data = makeCertificateData()
      const entity = { id: 'cert-uuid' } as MedicalCertificate
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makeCertificateData()
      const entity = { id: 'cert-uuid' } as MedicalCertificate
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalCertificate)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('cert-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('cert-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('cert-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalCertificate)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('cert-uuid')
    })
  })
})
