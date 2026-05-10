jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { PatientGender } from '@app/shared'
import { patientsService } from './patients.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('patientsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /patients and returns result', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    const result = await patientsService.getAll()

    expect(mockApiClient.get).toHaveBeenCalledWith('/patients')
    expect(result).toBe(response)
  })

  it('getAll calls GET /patients with search param', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    await patientsService.getAll({ search: 'João' })

    expect(mockApiClient.get).toHaveBeenCalledWith('/patients?search=Jo%C3%A3o')
  })

  it('getAll calls GET /patients with page and limit params', async () => {
    const response = { data: [makeDto()], total: 1, page: 2, limit: 10 }
    mockApiClient.get.mockResolvedValue(response)

    await patientsService.getAll({ page: 2, limit: 10 })

    expect(mockApiClient.get).toHaveBeenCalledWith('/patients?page=2&limit=10')
  })

  it('getById calls GET /patients/:id and returns result', async () => {
    const dto = makeDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await patientsService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/patients/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /patients with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = {
      fullName: 'João Silva',
      email: 'joao@example.com',
      phoneNumber: '(11) 99999-9999',
      birthDate: '1990-05-15',
      documentNumber: '12345678901',
      gender: PatientGender.MALE,
    }

    const result = await patientsService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/patients', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /patients/:id with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { fullName: 'João Atualizado' }

    const result = await patientsService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/patients/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('remove calls DELETE /patients/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await patientsService.remove('uuid-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/patients/uuid-1')
  })
})
