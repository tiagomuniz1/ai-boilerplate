jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { MedicalRecordFieldType } from '@app/shared'
import { medicalRecordTemplatesService } from './medical-record-templates.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [],
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('medicalRecordTemplatesService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /medical-record-templates without params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
      await medicalRecordTemplatesService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-templates')
    })

    it('calls GET with page and limit params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
      await medicalRecordTemplatesService.getAll({ page: 2, limit: 10 })
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-templates?page=2&limit=10')
    })

    it('returns API response', async () => {
      const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
      mockApiClient.get.mockResolvedValue(response)
      const result = await medicalRecordTemplatesService.getAll()
      expect(result).toBe(response)
    })
  })

  describe('getById', () => {
    it('calls GET /medical-record-templates/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto)
      const result = await medicalRecordTemplatesService.getById('uuid-1')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-templates/uuid-1')
      expect(result).toBe(dto)
    })
  })

  describe('create', () => {
    it('calls POST /medical-record-templates with data', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto)
      const input = {
        specialtyId: 'spec-uuid',
        name: 'Anamnese',
        fields: [{ label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: true, order: 0, canonical: false }],
      }
      const result = await medicalRecordTemplatesService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/medical-record-templates', input)
      expect(result).toBe(dto)
    })
  })

  describe('update', () => {
    it('calls PATCH /medical-record-templates/:id with data', async () => {
      const dto = makeDto()
      mockApiClient.patch.mockResolvedValue(dto)
      const input = { name: 'Novo nome' }
      const result = await medicalRecordTemplatesService.update('uuid-1', input as any)
      expect(mockApiClient.patch).toHaveBeenCalledWith('/medical-record-templates/uuid-1', input)
      expect(result).toBe(dto)
    })
  })

  describe('remove', () => {
    it('calls DELETE /medical-record-templates/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)
      await medicalRecordTemplatesService.remove('uuid-1')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/medical-record-templates/uuid-1')
    })
  })
})
