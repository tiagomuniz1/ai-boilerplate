import { toCreateMedicationDto } from './to-create-medication-dto.mapper'

describe('toCreateMedicationDto', () => {
  it('includes only the name when no optional fields are provided', () => {
    expect(toCreateMedicationDto({ name: 'Dipirona' })).toEqual({ name: 'Dipirona' })
  })

  it('passes through all provided fields', () => {
    const result = toCreateMedicationDto({
      name: 'Amoxicilina',
      activeIngredient: 'amoxicilina',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANTIBIOTICOS',
      holderCompany: 'ACME',
      registrationNumber: '999',
      registrationStatus: 'Ativo',
    })

    expect(result).toEqual({
      name: 'Amoxicilina',
      activeIngredient: 'amoxicilina',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANTIBIOTICOS',
      holderCompany: 'ACME',
      registrationNumber: '999',
      registrationStatus: 'Ativo',
    })
  })

  it('omits fields left undefined', () => {
    const result = toCreateMedicationDto({ name: 'Dipirona', activeIngredient: 'dipirona' })
    expect(result).toEqual({ name: 'Dipirona', activeIngredient: 'dipirona' })
    expect(result).not.toHaveProperty('holderCompany')
  })
})
