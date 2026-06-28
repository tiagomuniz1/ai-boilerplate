import { MedicationSource } from '@app/shared'
import { toMedicationModel } from './to-medication-model.mapper'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Dipirona Sódica',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: 'Genérico',
  therapeuticClass: 'ANALGESICOS',
  holderCompany: 'ACME',
  registrationNumber: '123',
  registrationStatus: 'Ativo',
  source: MedicationSource.ANVISA,
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

describe('toMedicationModel', () => {
  it('maps all fields and converts createdAt to a Date', () => {
    const result = toMedicationModel(makeDto() as never)

    expect(result).toEqual({
      id: 'uuid-1',
      name: 'Dipirona Sódica',
      activeIngredient: 'dipirona sódica',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANALGESICOS',
      holderCompany: 'ACME',
      registrationNumber: '123',
      registrationStatus: 'Ativo',
      source: MedicationSource.ANVISA,
      isActive: true,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
    })
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('preserves null optional fields', () => {
    const result = toMedicationModel(
      makeDto({
        activeIngredient: null,
        regulatoryCategory: null,
        therapeuticClass: null,
        holderCompany: null,
        registrationNumber: null,
        registrationStatus: null,
        source: MedicationSource.MANUAL,
      }) as never,
    )

    expect(result.activeIngredient).toBeNull()
    expect(result.registrationNumber).toBeNull()
    expect(result.source).toBe(MedicationSource.MANUAL)
  })
})
