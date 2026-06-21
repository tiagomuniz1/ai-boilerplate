jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsAdminService } from './canonical-fields-admin.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.TEXT,
  options: null,
  unit: 'mmHg',
  specialtyId: null,
  description: null,
  isActive: true,
})

describe('canonicalFieldsAdminService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /medical-record-canonical-fields without params', async () => {
      mockApiClient.get.mockResolvedValue([makeDto()])
      await canonicalFieldsAdminService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-canonical-fields')
    })

    it('calls GET with includeInactive=true when set', async () => {
      mockApiClient.get.mockResolvedValue([makeDto()])
      await canonicalFieldsAdminService.getAll({ includeInactive: true })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/medical-record-canonical-fields?includeInactive=true',
      )
    })

    it('calls GET with specialtyId param when set', async () => {
      mockApiClient.get.mockResolvedValue([makeDto()])
      await canonicalFieldsAdminService.getAll({ specialtyId: 'spec-uuid' })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/medical-record-canonical-fields?specialtyId=spec-uuid',
      )
    })

    it('calls GET with both params combined', async () => {
      mockApiClient.get.mockResolvedValue([makeDto()])
      await canonicalFieldsAdminService.getAll({ specialtyId: 'spec-uuid', includeInactive: true })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/medical-record-canonical-fields?specialtyId=spec-uuid&includeInactive=true',
      )
    })

    it('returns API response', async () => {
      const response = [makeDto()]
      mockApiClient.get.mockResolvedValue(response)
      const result = await canonicalFieldsAdminService.getAll()
      expect(result).toBe(response)
    })
  })

  describe('create', () => {
    it('calls POST /medical-record-canonical-fields with data', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto)
      const input = { canonicalKey: 'blood_pressure', label: 'Pressão arterial', type: MedicalRecordFieldType.TEXT }

      const result = await canonicalFieldsAdminService.create(input)

      expect(mockApiClient.post).toHaveBeenCalledWith('/medical-record-canonical-fields', input)
      expect(result).toBe(dto)
    })
  })

  describe('getById', () => {
    it('calls GET /medical-record-canonical-fields/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto)

      const result = await canonicalFieldsAdminService.getById('uuid-1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-canonical-fields/uuid-1')
      expect(result).toBe(dto)
    })
  })

  describe('update', () => {
    it('calls PATCH /medical-record-canonical-fields/:id with data', async () => {
      const dto = makeDto()
      mockApiClient.patch.mockResolvedValue(dto)
      const input = { label: 'Pressão arterial atualizada' }

      const result = await canonicalFieldsAdminService.update('uuid-1', input)

      expect(mockApiClient.patch).toHaveBeenCalledWith('/medical-record-canonical-fields/uuid-1', input)
      expect(result).toBe(dto)
    })
  })
})
