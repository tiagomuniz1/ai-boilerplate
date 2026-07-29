import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { DownloadConsultationPhotoFileUseCase } from '../use-cases/download-consultation-photo-file.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const photoId = 'photo-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePhoto = (overrides = {}) => ({
  id: photoId,
  clinicId,
  appointmentId: 'appointment-uuid',
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
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorageAdapter: jest.Mocked<IStorageAdapter> = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
}

describe('DownloadConsultationPhotoFileUseCase', () => {
  let useCase: DownloadConsultationPhotoFileUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DownloadConsultationPhotoFileUseCase(
      {} as DataSource,
      mockConsultationPhotosRepository,
      mockProfessionalsRepository,
      mockStorageAdapter,
    )
    mockConsultationPhotosRepository.findById.mockResolvedValue(makePhoto() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('image-bytes'))
  })

  it('returns the file buffer, name and mime type for ADMIN', async () => {
    const result = await useCase.execute(photoId, adminUser)

    expect(result.buffer.toString()).toBe('image-bytes')
    expect(result.fileName).toBe('evolucao.jpg')
    expect(result.mimeType).toBe('image/jpeg')
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns the file for PROFESSIONAL who owns the photo', async () => {
    const result = await useCase.execute(photoId, professionalUser)

    expect(result.buffer.toString()).toBe('image-bytes')
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(professionalUser.id, clinicId)
  })

  it('downloads using the stored filePath, scoped to the storage adapter (never a public URL)', async () => {
    await useCase.execute(photoId, adminUser)

    expect(mockStorageAdapter.download).toHaveBeenCalledWith(
      'consultation-photos/clinic-uuid/appointment-uuid/photo-uuid.jpg',
    )
  })

  it('throws NotFoundException when the photo does not exist', async () => {
    mockConsultationPhotosRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(photoId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when PROFESSIONAL is not the owner of the photo', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-professional' } as any)

    await expect(useCase.execute(photoId, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when PROFESSIONAL has no professional profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(photoId, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })
})
