jest.mock('@/lib/api-client')

import { MedicalCertificateType } from '@app/shared'
import { apiClient } from '@/lib/api-client'
import { atestadosService } from './atestados.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'cert-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: '2026-01-05',
  cidCode: null,
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
  issuedAt: new Date(),
  createdAt: new Date(),
})

describe('atestadosService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getByAppointment', () => {
    it('calls GET /medical-certificates?appointmentId=', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)
      const result = await atestadosService.getByAppointment('appt-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-certificates?appointmentId=appt-uuid')
      expect(result).toBe(dtos)
    })
  })

  describe('getById', () => {
    it('calls GET /medical-certificates/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto as any)
      const result = await atestadosService.getById('cert-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-certificates/cert-uuid')
      expect(result).toBe(dto)
    })
  })

  describe('create', () => {
    it('calls POST /medical-certificates with body', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto as any)
      const input = { appointmentId: 'appt-uuid', type: MedicalCertificateType.LEAVE, daysOff: 3, startDate: '2026-01-05' }
      const result = await atestadosService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/medical-certificates', input)
      expect(result).toBe(dto)
    })
  })

  describe('remove', () => {
    it('calls DELETE /medical-certificates/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await atestadosService.remove('cert-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/medical-certificates/cert-uuid')
    })
  })

  describe('downloadPdf', () => {
    it('calls getBlob /medical-certificates/:id/pdf', async () => {
      const blob = new Blob(['%PDF'], { type: 'application/pdf' })
      mockApiClient.getBlob.mockResolvedValue(blob)
      const result = await atestadosService.downloadPdf('cert-uuid')
      expect(mockApiClient.getBlob).toHaveBeenCalledWith('/medical-certificates/cert-uuid/pdf')
      expect(result).toBe(blob)
    })
  })
})
