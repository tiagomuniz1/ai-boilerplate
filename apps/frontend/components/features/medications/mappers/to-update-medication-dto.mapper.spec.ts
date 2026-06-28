import { toUpdateMedicationDto } from './to-update-medication-dto.mapper'

describe('toUpdateMedicationDto', () => {
  it('returns an empty object when nothing is provided', () => {
    expect(toUpdateMedicationDto({})).toEqual({})
  })

  it('includes only the provided fields', () => {
    expect(toUpdateMedicationDto({ name: 'Novo', isActive: false })).toEqual({
      name: 'Novo',
      isActive: false,
    })
  })

  it('passes through every field when all are provided', () => {
    const result = toUpdateMedicationDto({
      name: 'Dipirona',
      activeIngredient: 'dipirona',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANALGESICOS',
      holderCompany: 'ACME',
      registrationNumber: '123',
      registrationStatus: 'Inativo',
      isActive: true,
    })

    expect(result).toEqual({
      name: 'Dipirona',
      activeIngredient: 'dipirona',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANALGESICOS',
      holderCompany: 'ACME',
      registrationNumber: '123',
      registrationStatus: 'Inativo',
      isActive: true,
    })
  })

  it('keeps isActive=false (does not drop falsy boolean)', () => {
    expect(toUpdateMedicationDto({ isActive: false })).toEqual({ isActive: false })
  })
})
