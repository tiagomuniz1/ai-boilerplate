jest.mock('@/lib/api-client')

import { AppointmentStatus } from '@app/shared'
import { apiClient } from '@/lib/api-client'
import { appointmentsService } from './appointments.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('appointmentsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /appointments without query when no params', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getAll()
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointments')
  })

  it('getAll appends professionalId to query string', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getAll({ professionalId: 'doc-uuid' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointments?professionalId=doc-uuid')
  })

  it('getAll appends all filters to query string', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getAll({
      professionalId: 'doc-uuid',
      patientId: 'pat-uuid',
      status: AppointmentStatus.SCHEDULED,
      from: '2025-06-01',
      to: '2025-06-30',
      page: 2,
      limit: 10,
    })
    const call = (mockApiClient.get as jest.Mock).mock.calls[0][0] as string
    expect(call).toContain('professionalId=doc-uuid')
    expect(call).toContain('patientId=pat-uuid')
    expect(call).toContain('status=scheduled')
    expect(call).toContain('from=2025-06-01')
    expect(call).toContain('to=2025-06-30')
    expect(call).toContain('page=2')
    expect(call).toContain('limit=10')
  })

  it('getById calls GET /appointments/:id', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getById('some-uuid')
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointments/some-uuid')
  })

  it('getAvailability calls GET /appointments/availability with date', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getAvailability({ date: '2025-06-20' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointments/availability?date=2025-06-20')
  })

  it('getAvailability includes professionalId when provided', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    appointmentsService.getAvailability({ professionalId: 'doc-uuid', date: '2025-06-20' })
    const call = (mockApiClient.get as jest.Mock).mock.calls[0][0] as string
    expect(call).toContain('professionalId=doc-uuid')
    expect(call).toContain('date=2025-06-20')
  })

  it('book calls POST /appointments with data', () => {
    mockApiClient.post.mockResolvedValue({} as any)
    const data = { patientId: 'pat-uuid', date: '2025-06-20', startTime: '08:00' }
    appointmentsService.book(data)
    expect(mockApiClient.post).toHaveBeenCalledWith('/appointments', data)
  })

  it('cancel calls PATCH /appointments/:id/cancel with data', () => {
    mockApiClient.patch.mockResolvedValue({} as any)
    appointmentsService.cancel('apt-uuid', { cancellationReason: 'reason' })
    expect(mockApiClient.patch).toHaveBeenCalledWith('/appointments/apt-uuid/cancel', {
      cancellationReason: 'reason',
    })
  })

  it('complete calls PATCH /appointments/:id/complete', () => {
    mockApiClient.patch.mockResolvedValue({} as any)
    appointmentsService.complete('apt-uuid')
    expect(mockApiClient.patch).toHaveBeenCalledWith('/appointments/apt-uuid/complete', {})
  })

  it('getReassignCandidates calls GET /appointments/:id/reassign-candidates', () => {
    mockApiClient.get.mockResolvedValue([] as any)
    appointmentsService.getReassignCandidates('apt-uuid')
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointments/apt-uuid/reassign-candidates')
  })

  it('reassign calls PATCH /appointments/:id/reassign with professionalId', () => {
    mockApiClient.patch.mockResolvedValue({} as any)
    appointmentsService.reassign('apt-uuid', 'doc-uuid')
    expect(mockApiClient.patch).toHaveBeenCalledWith('/appointments/apt-uuid/reassign', {
      professionalId: 'doc-uuid',
    })
  })
})
