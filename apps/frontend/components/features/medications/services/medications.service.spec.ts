jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

import { apiClient } from '@/lib/api-client'
import { medicationsService } from './medications.service'

describe('medicationsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('requests without query string when no params are passed', () => {
      medicationsService.getAll()
      expect(apiClient.get).toHaveBeenCalledWith('/medications')
    })

    it('serializes page, limit, search and includeInactive', () => {
      medicationsService.getAll({ page: 2, limit: 20, search: 'dipi', includeInactive: true })
      expect(apiClient.get).toHaveBeenCalledWith(
        '/medications?page=2&limit=20&search=dipi&includeInactive=true',
      )
    })

    it('omits includeInactive when false', () => {
      medicationsService.getAll({ page: 1, includeInactive: false })
      expect(apiClient.get).toHaveBeenCalledWith('/medications?page=1')
    })
  })

  it('getById requests the medication by id', () => {
    medicationsService.getById('m1')
    expect(apiClient.get).toHaveBeenCalledWith('/medications/m1')
  })

  it('create posts the dto', () => {
    medicationsService.create({ name: 'Dipirona' })
    expect(apiClient.post).toHaveBeenCalledWith('/medications', { name: 'Dipirona' })
  })

  it('update patches the dto', () => {
    medicationsService.update('m1', { isActive: false })
    expect(apiClient.patch).toHaveBeenCalledWith('/medications/m1', { isActive: false })
  })

  it('remove deletes the medication', () => {
    medicationsService.remove('m1')
    expect(apiClient.delete).toHaveBeenCalledWith('/medications/m1')
  })
})
