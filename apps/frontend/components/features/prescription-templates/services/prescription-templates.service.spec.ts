jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { prescriptionTemplatesService } from './prescription-templates.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'tpl-uuid',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. House',
  name: 'Modelo A',
  items: [{ medicationId: 'med-uuid', name: 'Dipirona', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp' }],
  notes: null,
  isActive: true,
  createdAt: new Date(),
})

describe('prescriptionTemplatesService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /prescription-templates without query when no params', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)
      const result = await prescriptionTemplatesService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/prescription-templates')
      expect(result).toBe(dtos)
    })

    it('calls GET /prescription-templates?professionalId= when professionalId provided', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)
      const result = await prescriptionTemplatesService.getAll({ professionalId: 'doctor-uuid' })
      expect(mockApiClient.get).toHaveBeenCalledWith('/prescription-templates?professionalId=doctor-uuid')
      expect(result).toBe(dtos)
    })
  })

  describe('getById', () => {
    it('calls GET /prescription-templates/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto as any)
      const result = await prescriptionTemplatesService.getById('tpl-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/prescription-templates/tpl-uuid')
      expect(result).toBe(dto)
    })
  })

  describe('create', () => {
    it('calls POST /prescription-templates with body', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto as any)
      const input = { name: 'Modelo A', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
      const result = await prescriptionTemplatesService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/prescription-templates', input)
      expect(result).toBe(dto)
    })
  })

  describe('update', () => {
    it('calls PATCH /prescription-templates/:id with body', async () => {
      const dto = makeDto()
      mockApiClient.patch.mockResolvedValue(dto as any)
      const input = { name: 'Novo nome' }
      const result = await prescriptionTemplatesService.update('tpl-uuid', input as any)
      expect(mockApiClient.patch).toHaveBeenCalledWith('/prescription-templates/tpl-uuid', input)
      expect(result).toBe(dto)
    })
  })

  describe('remove', () => {
    it('calls DELETE /prescription-templates/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await prescriptionTemplatesService.remove('tpl-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/prescription-templates/tpl-uuid')
    })
  })
})
