import { toCreateVaccineIndicationDto } from './to-create-vaccine-indication-dto.mapper'

describe('toCreateVaccineIndicationDto', () => {
  it('envia apenas vaccineId quando dose e orientação estão vazias', () => {
    const dto = toCreateVaccineIndicationDto({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1', doseLabel: '', instructions: '   ' }],
      notes: '',
    })
    expect(dto).toEqual({ appointmentId: 'appointment-uuid', items: [{ vaccineId: 'v1' }] })
  })

  // O backend valida MaxLength e grava o que chegar: string vazia viraria dose
  // em branco impressa no documento.
  it('não envia campo opcional em branco', () => {
    const dto = toCreateVaccineIndicationDto({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1' }],
    })
    expect(dto.items[0]).not.toHaveProperty('doseLabel')
    expect(dto).not.toHaveProperty('notes')
  })

  it('apara espaços do que foi digitado', () => {
    const dto = toCreateVaccineIndicationDto({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1', doseLabel: '  1ª dose  ', instructions: '  Aplicar hoje  ' }],
      notes: '  Retorno em 30 dias.  ',
    })
    expect(dto.items[0].doseLabel).toBe('1ª dose')
    expect(dto.items[0].instructions).toBe('Aplicar hoje')
    expect(dto.notes).toBe('Retorno em 30 dias.')
  })

  it('repassa registro e especialidade de assinatura quando informados', () => {
    const dto = toCreateVaccineIndicationDto({
      appointmentId: 'appointment-uuid',
      registrationId: 'reg-1',
      specialtyId: 'spec-1',
      items: [{ vaccineId: 'v1' }],
    })
    expect(dto.registrationId).toBe('reg-1')
    expect(dto.specialtyId).toBe('spec-1')
  })

  it('omite registro e especialidade quando não informados', () => {
    const dto = toCreateVaccineIndicationDto({
      appointmentId: 'appointment-uuid',
      items: [{ vaccineId: 'v1' }],
    })
    expect(dto).not.toHaveProperty('registrationId')
    expect(dto).not.toHaveProperty('specialtyId')
  })
})
