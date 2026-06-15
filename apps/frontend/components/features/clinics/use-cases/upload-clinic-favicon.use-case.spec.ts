jest.mock('../services/clinics.service')

import { clinicsService } from '../services/clinics.service'
import { uploadClinicFaviconUseCase } from './upload-clinic-favicon.use-case'

const mockClinicsService = clinicsService as jest.Mocked<typeof clinicsService>

const makeDto = (overrides: object = {}) => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  logoUrl: null as string | null,
  faviconUrl: 'https://bucket.s3.us-east-1.amazonaws.com/clinics/uuid-1/favicon.ico',
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
  ...overrides,
})

describe('uploadClinicFaviconUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls clinicsService.uploadFavicon with the file and returns mapped model', async () => {
    const dto = makeDto()
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    mockClinicsService.uploadFavicon.mockResolvedValue(dto as any)

    const result = await uploadClinicFaviconUseCase(file)

    expect(mockClinicsService.uploadFavicon).toHaveBeenCalledWith(file)
    expect(result.id).toBe(dto.id)
    expect(result.faviconUrl).toBe(dto.faviconUrl)
  })

  it('calls clinicsService.uploadFaviconById when clinicId is provided', async () => {
    const dto = makeDto()
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    mockClinicsService.uploadFaviconById.mockResolvedValue(dto as any)

    const result = await uploadClinicFaviconUseCase(file, 'clinic-uuid-1')

    expect(mockClinicsService.uploadFaviconById).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(mockClinicsService.uploadFavicon).not.toHaveBeenCalled()
    expect(result.id).toBe(dto.id)
  })

  it('maps faviconUrl from dto to model', async () => {
    const url = 'https://s3.amazonaws.com/clinics/uuid-1/favicon.png'
    mockClinicsService.uploadFavicon.mockResolvedValue(makeDto({ faviconUrl: url }) as any)

    const result = await uploadClinicFaviconUseCase(new File([''], 'favicon.png'))

    expect(result.faviconUrl).toBe(url)
  })

  it('propagates error when service throws', async () => {
    mockClinicsService.uploadFavicon.mockRejectedValue(new Error('Upload failed'))

    await expect(
      uploadClinicFaviconUseCase(new File([''], 'favicon.ico')),
    ).rejects.toThrow('Upload failed')
  })
})
