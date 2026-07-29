import { QueryRunner, Repository } from 'typeorm'
import { ConsultationPhoto } from '../entities/consultation-photo.entity'
import { ConsultationPhotosRepository } from './consultation-photos.repository'
import { CreateConsultationPhotoData } from './consultation-photos.repository.interface'

function makeQueryBuilderMock(overrides: { getCount?: number; getRawAndEntities?: any } = {}) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(overrides.getCount ?? 0),
    getRawAndEntities: jest.fn().mockResolvedValue(overrides.getRawAndEntities ?? { entities: [], raw: [] }),
  }
}

function makeRepo(): jest.Mocked<Repository<ConsultationPhoto>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<ConsultationPhoto>>
}

function makePhotoData(): CreateConsultationPhotoData {
  return {
    id: 'photo-uuid',
    clinicId: 'clinic-uuid',
    appointmentId: 'appointment-uuid',
    patientId: 'patient-uuid',
    professionalId: 'professional-uuid',
    filePath: 'consultation-photos/clinic-uuid/appointment-uuid/photo-uuid.jpg',
    fileName: 'evolucao.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 54321,
    uploadedByUserId: 'user-uuid',
  }
}

describe('ConsultationPhotosRepository', () => {
  let mockRepo: jest.Mocked<Repository<ConsultationPhoto>>
  let repository: ConsultationPhotosRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepo = makeRepo()
    repository = new ConsultationPhotosRepository(mockRepo)
  })

  describe('findByAppointment', () => {
    it('queries by appointmentId and clinicId ordered by createdAt DESC', async () => {
      mockRepo.find.mockResolvedValue([])
      await repository.findByAppointment('appointment-uuid', 'clinic-uuid')

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { appointmentId: 'appointment-uuid', clinicId: 'clinic-uuid' },
        order: { createdAt: 'DESC' },
      })
    })
  })

  describe('findByPatient', () => {
    it('joins professionals/users for professionalName and appointments for appointmentDate', async () => {
      const photoEntity = { id: 'photo-uuid' } as ConsultationPhoto
      const qb = makeQueryBuilderMock({
        getCount: 1,
        getRawAndEntities: {
          entities: [photoEntity],
          raw: [{ professionalName: 'Ana Nutri', appointmentDate: new Date('2026-01-05') }],
        },
      })
      mockRepo.createQueryBuilder.mockReturnValue(qb as any)

      const [data, total] = await repository.findByPatient('clinic-uuid', 'patient-uuid', 1, 20)

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('cp')
      expect(qb.leftJoin).toHaveBeenCalledWith('professionals', 'prof', 'prof.id = cp.professional_id')
      expect(qb.leftJoin).toHaveBeenCalledWith('users', 'u', 'u.id = prof.user_id')
      expect(qb.leftJoin).toHaveBeenCalledWith('appointments', 'appt', 'appt.id = cp.appointment_id')
      expect(qb.where).toHaveBeenCalledWith('cp.clinicId = :clinicId', { clinicId: 'clinic-uuid' })
      expect(qb.andWhere).toHaveBeenCalledWith('cp.patientId = :patientId', { patientId: 'patient-uuid' })
      expect(qb.orderBy).toHaveBeenCalledWith('cp.createdAt', 'DESC')
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(total).toBe(1)
      expect(data[0].id).toBe('photo-uuid')
      expect(data[0].professionalName).toBe('Ana Nutri')
      expect(data[0].appointmentDate).toEqual(new Date('2026-01-05'))
    })

    it('filters by professionalId when provided (PROFESSIONAL isolation)', async () => {
      const qb = makeQueryBuilderMock()
      mockRepo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findByPatient('clinic-uuid', 'patient-uuid', 1, 20, 'professional-uuid')

      expect(qb.andWhere).toHaveBeenCalledWith('cp.professionalId = :professionalId', {
        professionalId: 'professional-uuid',
      })
    })

    it('does not filter by professionalId when not provided (ADMIN sees all)', async () => {
      const qb = makeQueryBuilderMock()
      mockRepo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findByPatient('clinic-uuid', 'patient-uuid', 1, 20)

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'cp.professionalId = :professionalId',
        expect.anything(),
      )
    })

    it('paginates using page/limit', async () => {
      const qb = makeQueryBuilderMock()
      mockRepo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findByPatient('clinic-uuid', 'patient-uuid', 3, 10)

      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  describe('findById', () => {
    it('queries by id and clinicId', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      await repository.findById('photo-uuid', 'clinic-uuid')
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'photo-uuid', clinicId: 'clinic-uuid' } })
    })

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await repository.findById('photo-uuid', 'clinic-uuid')
      expect(result).toBeNull()
    })

    it('returns the photo when found', async () => {
      const photo = { id: 'photo-uuid' } as ConsultationPhoto
      mockRepo.findOne.mockResolvedValue(photo)
      const result = await repository.findById('photo-uuid', 'clinic-uuid')
      expect(result).toBe(photo)
    })
  })

  describe('create', () => {
    it('creates and saves a consultation photo', async () => {
      const data = makePhotoData()
      const entity = { id: 'photo-uuid' } as ConsultationPhoto
      mockRepo.create.mockReturnValue(entity)
      mockRepo.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(mockRepo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner when provided', async () => {
      const data = makePhotoData()
      const entity = { id: 'photo-uuid' } as ConsultationPhoto
      const mockQrRepo = { create: jest.fn().mockReturnValue(entity), save: jest.fn().mockResolvedValue(entity) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ConsultationPhoto)
      expect(mockQrRepo.create).toHaveBeenCalledWith(data)
      expect(mockQrRepo.save).toHaveBeenCalledWith(entity)
    })
  })

  describe('delete', () => {
    it('soft-deletes by id', async () => {
      mockRepo.softDelete.mockResolvedValue(undefined as any)
      await repository.delete('photo-uuid')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('photo-uuid')
    })

    it('uses queryRunner when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } } as unknown as QueryRunner

      await repository.delete('photo-uuid', queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ConsultationPhoto)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('photo-uuid')
    })
  })
})
