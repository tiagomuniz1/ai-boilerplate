// Com o pdfmake real: prova que a definição montada gera PDF de verdade.
// O conteúdo é asserido em vaccine-indication-pdf-builder.content.spec.ts.
import { CouncilType, VaccineIndicationSnapshot } from '@app/shared'
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

const snapshot: VaccineIndicationSnapshot = {
  issuedAt: '2026-09-04T10:00:00.000Z',
  clinic: {
    name: 'Clínica Pulso',
    address: { street: 'Rua das Flores', number: '100', complement: null, neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
    logoUrl: null,
  },
  professional: { name: 'Dra. Helena', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: '222', specialtyName: 'Ginecologia' },
  patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678901' },
  items: [{ vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' }],
  notes: 'Retorno em 30 dias.',
}

describe('VaccineIndicationPdfBuilderService', () => {
  let service: VaccineIndicationPdfBuilderService

  beforeEach(() => {
    service = new VaccineIndicationPdfBuilderService()
    service.onModuleInit()
  })

  it('gera um PDF válido', async () => {
    const buffer = await service.build(snapshot, null)
    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('gera PDF com logo embutido', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const buffer = await service.build(snapshot, tinyPng)
    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF')
  })
})
