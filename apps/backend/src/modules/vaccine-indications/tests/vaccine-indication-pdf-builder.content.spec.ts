// O buffer do PDF é opaco: asserir `%PDF` prova que o pdfmake não quebrou, não
// que o documento diz o que deve dizer. Aqui o pdfmake é mockado para capturar
// a definição do documento e asserir o conteúdo — nome da paciente, vacina
// indicada, dose e a assinatura com conselho e registro.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(() => ({ getBuffer: jest.fn(async () => Buffer.from('%PDF-fake')) })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { CouncilType, VaccineIndicationSnapshot } from '@app/shared'
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

const makeSnapshot = (overrides: Partial<VaccineIndicationSnapshot> = {}): VaccineIndicationSnapshot => ({
  issuedAt: '2026-09-04T10:00:00.000Z',
  clinic: {
    name: 'Clínica Pulso',
    address: {
      street: 'Rua das Flores',
      number: '100',
      complement: 'Sala 2',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
    },
    logoUrl: null,
  },
  professional: {
    name: 'Dra. Helena Vasconcelos',
    councilType: CouncilType.CRM,
    registrationNumber: '12345/SP',
    registryNumber: null,
    specialtyName: 'Ginecologia e Obstetrícia',
  },
  patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678901' },
  items: [
    { vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' },
  ],
  notes: null,
  ...overrides,
})

async function textOf(snapshot: VaccineIndicationSnapshot, logo: string | null = null): Promise<string> {
  const service = new VaccineIndicationPdfBuilderService()
  service.onModuleInit()
  await service.build(snapshot, logo)
  const definition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)![0]
  return JSON.stringify(definition)
}

describe('VaccineIndicationPdfBuilderService — conteúdo do documento', () => {
  beforeEach(() => jest.clearAllMocks())

  it('nomeia o documento como indicação, não como receita', async () => {
    const text = await textOf(makeSnapshot())
    expect(text).toContain('Indicação de vacina')
    expect(text).not.toContain('Receita')
  })

  it('traz paciente, CPF formatado e a vacina com sigla e dose', async () => {
    const text = await textOf(makeSnapshot())
    expect(text).toContain('Clara Monteiro Alves')
    expect(text).toContain('123.456.789-01')
    expect(text).toContain('Tríplice viral (SCR)')
    expect(text).toContain('1ª dose')
    expect(text).toContain('Aplicar em serviço de imunização')
  })

  // Quem assina responde pelo documento: nome, conselho e registro têm de sair.
  it('assina com nome, conselho e registro', async () => {
    const text = await textOf(makeSnapshot())
    expect(text).toContain('Dra. Helena Vasconcelos')
    expect(text).toContain('CRM 12345/SP')
    expect(text).toContain('Ginecologia e Obstetrícia')
  })

  it('acrescenta o RQE quando o profissional tem', async () => {
    const text = await textOf(
      makeSnapshot({
        professional: { name: 'Dra. Helena', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: '222', specialtyName: 'Mastologia' },
      }),
    )
    expect(text).toContain('RQE 222')
  })

  it('omite o RQE quando não há', async () => {
    expect(await textOf(makeSnapshot())).not.toContain('RQE')
  })

  it('usa o conselho de quem assinou, não CRM fixo', async () => {
    const text = await textOf(
      makeSnapshot({
        professional: { name: 'Ana Nutricionista', councilType: CouncilType.CRN, registrationNumber: '9999/SP', registryNumber: null, specialtyName: null },
      }),
    )
    expect(text).toContain('CRN 9999/SP')
    expect(text).not.toContain('CRM')
  })

  it('numera cada vacina indicada', async () => {
    const text = await textOf(
      makeSnapshot({
        items: [
          { vaccineId: 'v1', name: 'Hepatite B', abbreviation: null, doseLabel: null, instructions: null },
          { vaccineId: 'v2', name: 'dTpa', abbreviation: 'dTpa', doseLabel: 'reforço', instructions: null },
        ],
      }),
    )
    expect(text).toContain('1. Hepatite B')
    expect(text).toContain('2. dTpa (dTpa)')
  })

  it('escreve a cidade e a data por extenso no rodapé', async () => {
    const text = await textOf(makeSnapshot())
    expect(text).toContain('São Paulo, 4 de setembro de 2026')
  })

  it('cai para só a data quando a clínica não tem endereço', async () => {
    const text = await textOf(makeSnapshot({ clinic: { name: 'Clínica Pulso', address: null, logoUrl: null } }))
    expect(text).toContain('4 de setembro de 2026')
    expect(text).not.toContain('São Paulo,')
  })

  it('mostra CPF não informado quando o paciente não tem documento', async () => {
    const text = await textOf(makeSnapshot({ patient: { name: 'Recém-nascido Alves', documentNumber: null } }))
    expect(text).toContain('Não informado')
  })

  it('deixa passar documento que não é CPF de 11 dígitos, sem formatar', async () => {
    const text = await textOf(makeSnapshot({ patient: { name: 'Paciente', documentNumber: 'A1B2' } }))
    expect(text).toContain('A1B2')
  })

  it('inclui as observações quando existem', async () => {
    const text = await textOf(makeSnapshot({ notes: 'Retorno em 30 dias.' }))
    expect(text).toContain('Observações')
    expect(text).toContain('Retorno em 30 dias.')
  })

  it('omite a seção de observações quando não há', async () => {
    expect(await textOf(makeSnapshot())).not.toContain('Observações')
  })

  it('embute o logo quando é data URI de imagem', async () => {
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    expect(await textOf(makeSnapshot(), tinyPng)).toContain(tinyPng)
  })

  // O logo chega do snapshot, e o que não é data URI de imagem não entra no
  // documento — é a mesma guarda dos outros documentos da casa.
  it('ignora logo que não é data URI de imagem', async () => {
    const text = await textOf(makeSnapshot(), 'https://exemplo.com/logo.png')
    expect(text).not.toContain('https://exemplo.com/logo.png')
  })
})
