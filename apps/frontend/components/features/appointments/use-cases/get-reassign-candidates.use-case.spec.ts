jest.mock('../services/appointments.service')
jest.mock('../mappers/to-reassign-candidate-model.mapper')

import { appointmentsService } from '../services/appointments.service'
import { toReassignCandidateModel } from '../mappers/to-reassign-candidate-model.mapper'
import { getReassignCandidatesUseCase } from './get-reassign-candidates.use-case'

describe('getReassignCandidatesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches candidates and maps each one', async () => {
    const dtos = [
      { professionalId: 'd1', professionalName: 'Dr. Ana', specialtyName: 'Cardiologia' },
      { professionalId: 'd2', professionalName: 'Dr. Beto', specialtyName: 'Cardiologia' },
    ]
    ;(appointmentsService.getReassignCandidates as jest.Mock).mockResolvedValue(dtos)
    ;(toReassignCandidateModel as jest.Mock).mockImplementation((dto) => ({ ...dto, mapped: true }))

    const result = await getReassignCandidatesUseCase('apt-1')

    expect(appointmentsService.getReassignCandidates).toHaveBeenCalledWith('apt-1')
    expect(toReassignCandidateModel).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(2)
  })

  it('propagates errors from the service', async () => {
    ;(appointmentsService.getReassignCandidates as jest.Mock).mockRejectedValue({ status: 404 })
    await expect(getReassignCandidatesUseCase('apt-1')).rejects.toEqual({ status: 404 })
  })
})
