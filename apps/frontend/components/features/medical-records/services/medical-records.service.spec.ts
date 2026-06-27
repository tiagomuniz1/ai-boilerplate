jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { medicalRecordsService } from './medical-records.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. João',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [],
  data: {},
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('medicalRecordsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getById', () => {
    it('calls GET /medical-records/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto)
      const result = await medicalRecordsService.getById('uuid-1')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-records/uuid-1')
      expect(result).toBe(dto)
    })
  })

  describe('getByAppointment', () => {
    it('calls GET /medical-records/by-appointment/:appointmentId', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto)
      const result = await medicalRecordsService.getByAppointment('appt-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-records/by-appointment/appt-uuid')
      expect(result).toBe(dto)
    })
  })

  describe('listByPatient', () => {
    it('calls GET /medical-records?patientId= without extra params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
      await medicalRecordsService.listByPatient('patient-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-records?patientId=patient-uuid')
    })

    it('calls GET with page and limit params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
      await medicalRecordsService.listByPatient('patient-uuid', { page: 2, limit: 10 })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/medical-records?patientId=patient-uuid&page=2&limit=10',
      )
    })
  })

  describe('create', () => {
    it('calls POST /medical-records with data', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto)
      const input = { appointmentId: 'appt-uuid', data: {} }
      const result = await medicalRecordsService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/medical-records', input)
      expect(result).toBe(dto)
    })
  })

  describe('update', () => {
    it('calls PATCH /medical-records/:id with data', async () => {
      const dto = makeDto()
      mockApiClient.patch.mockResolvedValue(dto)
      const input = { notes: 'Observação' }
      const result = await medicalRecordsService.update('uuid-1', input as any)
      expect(mockApiClient.patch).toHaveBeenCalledWith('/medical-records/uuid-1', input)
      expect(result).toBe(dto)
    })
  })
})
