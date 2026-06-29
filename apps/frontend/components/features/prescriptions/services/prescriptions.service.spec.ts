jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { prescriptionsService } from './prescriptions.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'rx-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  issuedAt: new Date(),
  items: [{ medicationId: 'med-uuid', name: 'Dipirona', activeIngredient: null, instructions: 'Tomar 1 cp' }],
  notes: null,
  createdAt: new Date(),
})

describe('prescriptionsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getByAppointment', () => {
    it('calls GET /prescriptions?appointmentId=', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)
      const result = await prescriptionsService.getByAppointment('appt-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/prescriptions?appointmentId=appt-uuid')
      expect(result).toBe(dtos)
    })
  })

  describe('getById', () => {
    it('calls GET /prescriptions/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto as any)
      const result = await prescriptionsService.getById('rx-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/prescriptions/rx-uuid')
      expect(result).toBe(dto)
    })
  })

  describe('create', () => {
    it('calls POST /prescriptions with body', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto as any)
      const input = { appointmentId: 'appt-uuid', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
      const result = await prescriptionsService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/prescriptions', input)
      expect(result).toBe(dto)
    })
  })

  describe('remove', () => {
    it('calls DELETE /prescriptions/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await prescriptionsService.remove('rx-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/prescriptions/rx-uuid')
    })
  })

  describe('downloadPdf', () => {
    it('calls getBlob /prescriptions/:id/pdf', async () => {
      const blob = new Blob(['%PDF'], { type: 'application/pdf' })
      mockApiClient.getBlob.mockResolvedValue(blob)
      const result = await prescriptionsService.downloadPdf('rx-uuid')
      expect(mockApiClient.getBlob).toHaveBeenCalledWith('/prescriptions/rx-uuid/pdf')
      expect(result).toBe(blob)
    })
  })
})
