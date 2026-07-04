import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UploadClinicLogoUseCase } from '../use-cases/upload-clinic-logo.use-case'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { Clinic } from '../entities/clinic.entity'

const mockClinicsRepository: jest.Mocked<IClinicsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateLogo: jest.fn(),
  updateLogoDark: jest.fn(),
  updateFavicon: jest.fn(),
}

const mockStorageAdapter: jest.Mocked<IStorageAdapter> = {
  upload: jest.fn(),
  download: jest.fn(),
}

const mockCacheService = {
  del: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeClinic(overrides: Partial<Clinic> = {}): Clinic {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.lorem.slug(),
    isActive: true,
    themeId: null,
    logoUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressNeighborhood: null,
    addressCity: null,
    addressState: null,
    addressZipCode: null,
    addressCountry: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'logo',
    originalname: 'logo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  }
}

describe('UploadClinicLogoUseCase', () => {
  let useCase: UploadClinicLogoUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UploadClinicLogoUseCase(
      {} as DataSource,
      mockClinicsRepository,
      mockStorageAdapter,
      mockCacheService,
    )
  })

  it('uploads logo and returns updated ClinicResponseDto', async () => {
    const clinic = makeClinic()
    const logoUrl = `https://bucket.s3.us-east-1.amazonaws.com/clinics/${clinic.id}/logo.jpg`
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue(logoUrl)
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    const result = await useCase.execute(clinic.id, file)

    expect(mockStorageAdapter.upload).toHaveBeenCalledWith(
      file.buffer,
      `clinics/${clinic.id}/logo.jpg`,
      'image/jpeg',
      true,
    )
    expect(mockClinicsRepository.updateLogo).toHaveBeenCalledWith(clinic.id, logoUrl)
    expect(result.logoUrl).toBe(logoUrl)
    expect(result.id).toBe(clinic.id)
  })

  it('maps png mime type to correct extension', async () => {
    const clinic = makeClinic()
    const file = makeFile({ mimetype: 'image/png', originalname: 'logo.png' })

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/clinics/id/logo.png')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    await useCase.execute(clinic.id, file)

    expect(mockStorageAdapter.upload).toHaveBeenCalledWith(
      file.buffer,
      `clinics/${clinic.id}/logo.png`,
      'image/png',
      true,
    )
  })

  it('throws UnprocessableEntityException for svg (not supported for PDF rendering)', async () => {
    const clinic = makeClinic()
    const file = makeFile({ mimetype: 'image/svg+xml', originalname: 'logo.svg' })

    mockClinicsRepository.findById.mockResolvedValue(clinic)

    await expect(useCase.execute(clinic.id, file)).rejects.toThrow(UnprocessableEntityException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException for invalid mime type', async () => {
    const clinic = makeClinic()
    const file = makeFile({ mimetype: 'application/pdf' })

    mockClinicsRepository.findById.mockResolvedValue(clinic)

    await expect(useCase.execute(clinic.id, file)).rejects.toThrow(UnprocessableEntityException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
    expect(mockClinicsRepository.updateLogo).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when file exceeds 2MB', async () => {
    const clinic = makeClinic()
    const file = makeFile({ size: 2 * 1024 * 1024 + 1 })

    mockClinicsRepository.findById.mockResolvedValue(clinic)

    await expect(useCase.execute(clinic.id, file)).rejects.toThrow(UnprocessableEntityException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when clinic does not exist', async () => {
    mockClinicsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), makeFile())).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('propagates error when S3 upload fails', async () => {
    const clinic = makeClinic()
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockRejectedValue(new Error('S3 error'))

    await expect(useCase.execute(clinic.id, file)).rejects.toThrow('S3 error')
    expect(mockClinicsRepository.updateLogo).not.toHaveBeenCalled()
  })

  it('invalidates cache after successful upload', async () => {
    const clinic = makeClinic()
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/url')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    await useCase.execute(clinic.id, file)

    expect(mockCacheService.del).toHaveBeenCalledWith(`clinic:${clinic.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('clinics:list*')
  })

  it('includes address in response when clinic has address data', async () => {
    const clinic = makeClinic({
      addressStreet: 'Rua das Flores',
      addressNumber: '123',
      addressComplement: null,
      addressNeighborhood: 'Centro',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01310-100',
      addressCountry: 'BR',
    })
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/url')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    const result = await useCase.execute(clinic.id, file)

    expect(result.address).not.toBeNull()
    expect(result.address!.street).toBe('Rua das Flores')
  })

  it('includes themeId in response when clinic has a theme', async () => {
    const themeId = faker.string.uuid()
    const clinic = makeClinic({ themeId })
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/url')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    const result = await useCase.execute(clinic.id, file)

    expect(result.themeId).toBe(themeId)
  })

  it('preserves existing faviconUrl in response', async () => {
    const existingFaviconUrl = 'https://bucket.s3.us-east-1.amazonaws.com/clinics/id/favicon.ico'
    const clinic = makeClinic({ faviconUrl: existingFaviconUrl })
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/url')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)

    const result = await useCase.execute(clinic.id, file)

    expect(result.faviconUrl).toBe(existingFaviconUrl)
  })

  it('does not fail when cache invalidation throws', async () => {
    const clinic = makeClinic()
    const file = makeFile()

    mockClinicsRepository.findById.mockResolvedValue(clinic)
    mockStorageAdapter.upload.mockResolvedValue('https://bucket.s3.us-east-1.amazonaws.com/url')
    mockClinicsRepository.updateLogo.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(clinic.id, file)).resolves.toBeDefined()
  })
})
