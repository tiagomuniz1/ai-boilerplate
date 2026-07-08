import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'
import { StreamClinicAssetUseCase } from '../use-cases/stream-clinic-asset.use-case'

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

const makeClinic = (overrides: Partial<Clinic> = {}): Clinic =>
  ({
    id: faker.string.uuid(),
    slug: 'acme',
    logoPath: 'clinics/id/logo.png',
    logoDarkPath: 'clinics/id/logo-dark.svg',
    faviconPath: 'clinics/id/favicon.ico',
    ...overrides,
  }) as Clinic

describe('StreamClinicAssetUseCase', () => {
  let useCase: StreamClinicAssetUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new StreamClinicAssetUseCase({} as DataSource, mockClinicsRepository, mockStorageAdapter)
  })

  it('downloads the logo and derives content-type from the png extension', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic())
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('img'))

    const result = await useCase.execute('acme', 'logo')

    expect(mockStorageAdapter.download).toHaveBeenCalledWith('clinics/id/logo.png')
    expect(result.contentType).toBe('image/png')
    expect(result.buffer.toString()).toBe('img')
  })

  it('resolves logo-dark (svg) content-type', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic())
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('svg'))

    const result = await useCase.execute('acme', 'logo-dark')

    expect(mockStorageAdapter.download).toHaveBeenCalledWith('clinics/id/logo-dark.svg')
    expect(result.contentType).toBe('image/svg+xml')
  })

  it('resolves favicon (ico) content-type', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic())
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('ico'))

    const result = await useCase.execute('acme', 'favicon')

    expect(result.contentType).toBe('image/x-icon')
  })

  it('falls back to octet-stream for an unknown extension', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic({ logoPath: 'clinics/id/logo.bin' }))
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('bin'))

    const result = await useCase.execute('acme', 'logo')

    expect(result.contentType).toBe('application/octet-stream')
  })

  it('throws NotFoundException when the clinic does not exist', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)

    await expect(useCase.execute('missing', 'logo')).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when the requested asset is not set', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic({ logoPath: null }))

    await expect(useCase.execute('acme', 'logo')).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })
})
