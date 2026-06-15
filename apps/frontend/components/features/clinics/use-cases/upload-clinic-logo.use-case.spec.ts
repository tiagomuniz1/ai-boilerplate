jest.mock('../services/clinics.service')

import { clinicsService } from '../services/clinics.service'
import { uploadClinicLogoUseCase } from './upload-clinic-logo.use-case'

const mockClinicsService = clinicsService as jest.Mocked<typeof clinicsService>

const makeDto = (overrides: object = {}) => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  logoUrl: 'https://bucket.s3.us-east-1.amazonaws.com/clinics/uuid-1/logo.jpg',
  faviconUrl: null as string | null,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
  ...overrides,
})

describe('uploadClinicLogoUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls clinicsService.uploadLogo with the file and returns mapped model', async () => {
    const dto = makeDto()
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    mockClinicsService.uploadLogo.mockResolvedValue(dto as any)

    const result = await uploadClinicLogoUseCase(file)

    expect(mockClinicsService.uploadLogo).toHaveBeenCalledWith(file)
    expect(result.id).toBe(dto.id)
    expect(result.logoUrl).toBe(dto.logoUrl)
  })

  it('calls clinicsService.uploadLogoById when clinicId is provided', async () => {
    const dto = makeDto()
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    mockClinicsService.uploadLogoById.mockResolvedValue(dto as any)

    const result = await uploadClinicLogoUseCase(file, 'clinic-uuid-1')

    expect(mockClinicsService.uploadLogoById).toHaveBeenCalledWith('clinic-uuid-1', file)
    expect(mockClinicsService.uploadLogo).not.toHaveBeenCalled()
    expect(result.id).toBe(dto.id)
  })

  it('maps logoUrl from dto to model', async () => {
    const url = 'https://s3.amazonaws.com/clinics/uuid-1/logo.png'
    mockClinicsService.uploadLogo.mockResolvedValue(makeDto({ logoUrl: url }) as any)

    const result = await uploadClinicLogoUseCase(new File([''], 'logo.png'))

    expect(result.logoUrl).toBe(url)
  })

  it('propagates error when service throws', async () => {
    mockClinicsService.uploadLogo.mockRejectedValue(new Error('Upload failed'))

    await expect(
      uploadClinicLogoUseCase(new File([''], 'logo.jpg')),
    ).rejects.toThrow('Upload failed')
  })
})
