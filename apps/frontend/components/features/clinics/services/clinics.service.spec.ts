jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { clinicsService } from './clinics.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeClinicDto = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('clinicsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /clinics without query string when no params provided', async () => {
      const response = { data: [makeClinicDto()], total: 1, page: 1, limit: 20 }
      mockApiClient.get.mockResolvedValue(response)

      const result = await clinicsService.getAll()

      expect(mockApiClient.get).toHaveBeenCalledWith('/clinics')
      expect(result).toBe(response)
    })

    it('calls GET /clinics with search param', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

      await clinicsService.getAll({ search: 'coracao' })

      expect(mockApiClient.get).toHaveBeenCalledWith('/clinics?search=coracao')
    })

    it('calls GET /clinics with page and limit params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

      await clinicsService.getAll({ page: 2, limit: 10 })

      expect(mockApiClient.get).toHaveBeenCalledWith('/clinics?page=2&limit=10')
    })

    it('calls GET /clinics with all params combined', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

      await clinicsService.getAll({ search: 'coracao', page: 2, limit: 10 })

      expect(mockApiClient.get).toHaveBeenCalledWith('/clinics?search=coracao&page=2&limit=10')
    })
  })

  it('getById calls GET /clinics/:id and returns result', async () => {
    const dto = makeClinicDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await clinicsService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/clinics/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /clinics with data and returns result', async () => {
    const dto = makeClinicDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }

    const result = await clinicsService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/clinics', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /clinics/:id with data and returns result', async () => {
    const dto = makeClinicDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { name: 'Clínica Nova' }

    const result = await clinicsService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/clinics/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('uploadLogo builds FormData with "logo" field and calls POST /clinics/me/logo', async () => {
    const dto = makeClinicDto()
    mockApiClient.post.mockResolvedValue(dto)
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })

    const result = await clinicsService.uploadLogo(file)

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/clinics/me/logo',
      expect.any(FormData),
    )
    const formData = mockApiClient.post.mock.calls[0][1] as FormData
    expect(formData.get('logo')).toBe(file)
    expect(result).toBe(dto)
  })

  it('uploadFavicon builds FormData with "favicon" field and calls POST /clinics/me/favicon', async () => {
    const dto = makeClinicDto()
    mockApiClient.post.mockResolvedValue(dto)
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })

    const result = await clinicsService.uploadFavicon(file)

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/clinics/me/favicon',
      expect.any(FormData),
    )
    const formData = mockApiClient.post.mock.calls[0][1] as FormData
    expect(formData.get('favicon')).toBe(file)
    expect(result).toBe(dto)
  })

  it('register calls POST /clinics/register with data and returns result', async () => {
    const response = {
      clinic: { id: 'uuid-1', name: 'Clínica do Coração', slug: 'clinica-do-coracao' },
      admin: { id: 'admin-uuid', fullName: 'Admin Silva', email: 'admin@clinica.com' },
    }
    mockApiClient.post.mockResolvedValue(response)
    const input = {
      clinicName: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      adminFullName: 'Admin Silva',
      adminEmail: 'admin@clinica.com',
      adminPassword: 'senha1234',
    }

    const result = await clinicsService.register(input as any)

    expect(mockApiClient.post).toHaveBeenCalledWith('/clinics/register', input)
    expect(result).toBe(response)
  })
})
