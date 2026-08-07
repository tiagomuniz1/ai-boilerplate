import { toReassignCandidateModel } from './to-reassign-candidate-model.mapper'

describe('toReassignCandidateModel', () => {
  it('maps a candidate dto to the model', () => {
    const result = toReassignCandidateModel({
      professionalId: 'doc-1',
      professionalName: 'Dr. Ana',
      specialtyName: 'Cardiologia',
    })
    expect(result).toEqual({
      professionalId: 'doc-1',
      professionalName: 'Dr. Ana',
      specialtyName: 'Cardiologia',
    })
  })

  it('preserves a null specialtyName', () => {
    const result = toReassignCandidateModel({
      professionalId: 'doc-2',
      professionalName: 'Dr. Nut',
      specialtyName: null,
    })
    expect(result.specialtyName).toBeNull()
  })
})
