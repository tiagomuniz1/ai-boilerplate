import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { DeleteConsultationPhotoUseCase } from '../use-cases/delete-consultation-photo.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const photoId = 'photo-uuid'
const appointmentId = 'appointment-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePhoto = (overrides = {}) => ({
  id: photoId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  professionalId,
  filePath: 'consultation-photos/clinic-uuid/appointment-uuid/photo-uuid.jpg',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1024,
  uploadedByUserId: 'professional-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

const mockConsultationPhotosRepository: jest.Mocked<IConsultationPhotosRepository> = {
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorageAdapter: jest.Mocked<IStorageAdapter> = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('DeleteConsultationPhotoUseCase', () => {
  let useCase: DeleteConsultationPhotoUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteConsultationPhotoUseCase(
      mockDataSource,
      mockConsultationPhotosRepository,
      mockProfessionalsRepository,
      mockStorageAdapter,
      mockCacheService,
    )
    mockConsultationPhotosRepository.findById.mockResolvedValue(makePhoto() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockConsultationPhotosRepository.delete.mockResolvedValue(undefined)
    mockStorageAdapter.remove.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('deletes the photo for PROFESSIONAL who owns it', async () => {
    await useCase.execute(photoId, professionalUser)

    expect(mockConsultationPhotosRepository.delete).toHaveBeenCalledWith(photoId, mockQueryRunner)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(professionalUser.id, clinicId)
  })

  it('allows ADMIN to delete any photo without an ownership check (no professional profile required)', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(photoId, adminUser)).resolves.toBeUndefined()

    expect(mockConsultationPhotosRepository.delete).toHaveBeenCalledWith(photoId, mockQueryRunner)
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('removes the file from storage using the stored filePath', async () => {
    await useCase.execute(photoId, adminUser)

    expect(mockStorageAdapter.remove).toHaveBeenCalledWith(
      'consultation-photos/clinic-uuid/appointment-uuid/photo-uuid.jpg',
    )
  })

  it('invalidates the appointment cache', async () => {
    await useCase.execute(photoId, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`consultation-photos:appointment:${appointmentId}`)
  })

  it('does not throw when storage removal fails (soft-delete already committed)', async () => {
    mockStorageAdapter.remove.mockRejectedValue(new Error('S3 down'))

    await expect(useCase.execute(photoId, adminUser)).resolves.toBeUndefined()
    expect(mockConsultationPhotosRepository.delete).toHaveBeenCalled()
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(photoId, adminUser)).resolves.toBeUndefined()
  })

  it('throws NotFoundException when the photo does not exist', async () => {
    mockConsultationPhotosRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(photoId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockConsultationPhotosRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when PROFESSIONAL is not the owner of the photo', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-professional' } as any)

    await expect(useCase.execute(photoId, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockConsultationPhotosRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when PROFESSIONAL has no professional profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(photoId, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockConsultationPhotosRepository.delete).not.toHaveBeenCalled()
  })
})
