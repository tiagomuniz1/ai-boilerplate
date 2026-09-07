import { toVaccineIndicationModel } from './to-vaccine-indication-model.mapper'

describe('toVaccineIndicationModel', () => {
  const dto = {
    id: 'indication-uuid',
    appointmentId: 'appointment-uuid',
    patientId: 'patient-uuid',
    patientName: 'Clara Monteiro Alves',
    professionalId: 'professional-uuid',
    professionalName: 'Dra. Helena Vasconcelos',
    issuedAt: '2026-09-04T10:00:00.000Z',
    items: [
      { vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' },
    ],
    notes: 'Retorno em 30 dias.',
    createdAt: '2026-09-04T10:00:00.000Z',
  } as any

  it('converte as datas de string para Date', () => {
    const model = toVaccineIndicationModel(dto)
    expect(model.issuedAt).toBeInstanceOf(Date)
    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.issuedAt.toISOString()).toBe('2026-09-04T10:00:00.000Z')
  })

  it('preserva vacina, sigla, dose e orientação de cada item', () => {
    const model = toVaccineIndicationModel(dto)
    expect(model.items).toEqual([
      { vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' },
    ])
  })

  it('mantém nulos como nulos, sem inventar texto', () => {
    const model = toVaccineIndicationModel({
      ...dto,
      notes: null,
      items: [{ vaccineId: 'v1', name: 'BCG', abbreviation: null, doseLabel: null, instructions: null }],
    })
    expect(model.notes).toBeNull()
    expect(model.items[0].abbreviation).toBeNull()
    expect(model.items[0].doseLabel).toBeNull()
    expect(model.items[0].instructions).toBeNull()
  })
})
