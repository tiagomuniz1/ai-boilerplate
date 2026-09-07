import { PatientGender, VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import {
  evaluateVaccineSchedule,
  idadeEmMeses,
  type RegraAvaliavel,
} from '../utils/evaluate-vaccine-schedule'

const HOJE = '2026-09-04'
const VACINA = 'v-1'

function regra(overrides: Partial<RegraAvaliavel> = {}): RegraAvaliavel {
  return {
    vaccineId: VACINA,
    doseLabel: '1ª dose',
    doseOrder: 1,
    minAgeMonths: 12,
    maxAgeMonths: null,
    minIntervalDays: null,
    appliesToGender: null,
    ...overrides,
  }
}

function avaliar(params: {
  birthDate: string
  gender?: PatientGender
  regras: RegraAvaliavel[]
  doses?: { vaccineId: string; appliedAt: string }[]
  decisions?: { vaccineId: string; decision: VaccineDecision }[]
}) {
  return evaluateVaccineSchedule({
    birthDate: params.birthDate,
    gender: params.gender ?? PatientGender.FEMALE,
    hoje: HOJE,
    regras: params.regras,
    doses: params.doses ?? [],
    decisions: params.decisions ?? [],
  })
}

describe('idadeEmMeses', () => {
  it('conta os meses completos', () => {
    expect(idadeEmMeses('2025-09-04', HOJE)).toBe(12)
  })

  // O mês só fecha quando o dia do aniversário chega.
  it('não conta o mês na véspera do aniversário', () => {
    expect(idadeEmMeses('2025-09-05', HOJE)).toBe(11)
  })

  it('conta zero para quem nasceu hoje', () => {
    expect(idadeEmMeses(HOJE, HOJE)).toBe(0)
  })

  it('nunca devolve negativo para data de nascimento futura', () => {
    expect(idadeEmMeses('2027-01-01', HOJE)).toBe(0)
  })

  it('conta anos completos', () => {
    expect(idadeEmMeses('1988-03-22', HOJE)).toBe(461)
  })
})

describe('evaluateVaccineSchedule', () => {
  describe('dose ainda não devida', () => {
    it('marca como futura quem não chegou à idade mínima', () => {
      const [item] = avaliar({ birthDate: '2026-06-01', regras: [regra({ minAgeMonths: 12 })] })

      expect(item.status).toBe(VaccineScheduleStatus.FUTURA)
      expect(item.nextDoseLabel).toBe('1ª dose')
      expect(item.nextDoseDueFrom).toBe('2027-06-01')
    })
  })

  describe('dose devida', () => {
    it('marca como pendente quem já tem a idade e não tomou', () => {
      const [item] = avaliar({ birthDate: '2020-01-01', regras: [regra({ minAgeMonths: 12 })] })

      expect(item.status).toBe(VaccineScheduleStatus.PENDENTE)
      expect(item.dosesTaken).toBe(0)
      expect(item.dosesExpected).toBe(1)
    })

    // Passar da idade máxima é diferente de estar pendente: a janela fechou.
    it('marca como atrasada quem passou da idade máxima', () => {
      const [item] = avaliar({
        birthDate: '2000-01-01',
        regras: [regra({ minAgeMonths: 12, maxAgeMonths: 60 })],
      })

      expect(item.status).toBe(VaccineScheduleStatus.ATRASADA)
    })

    it('marca como em dia quem tomou todas as doses previstas', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        doses: [{ vaccineId: VACINA, appliedAt: '2021-02-01' }],
      })

      expect(item.status).toBe(VaccineScheduleStatus.EM_DIA)
      expect(item.nextDoseLabel).toBeNull()
      expect(item.dosesTaken).toBe(1)
    })
  })

  describe('esquema com várias doses', () => {
    const duasDoses = [
      regra({ doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 12 }),
      regra({ doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 15, minIntervalDays: 30 }),
    ]

    it('aponta a segunda dose depois da primeira', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: duasDoses,
        doses: [{ vaccineId: VACINA, appliedAt: '2021-02-01' }],
      })

      expect(item.status).toBe(VaccineScheduleStatus.PENDENTE)
      expect(item.nextDoseLabel).toBe('2ª dose')
      expect(item.dosesTaken).toBe(1)
      expect(item.dosesExpected).toBe(2)
    })

    // O intervalo desde a dose anterior manda quando é mais tarde que a idade.
    it('respeita o intervalo mínimo quando ele cai depois da idade mínima', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [
          regra({ doseOrder: 1, minAgeMonths: 12 }),
          regra({ doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 13, minIntervalDays: 60 }),
        ],
        doses: [{ vaccineId: VACINA, appliedAt: '2026-08-20' }],
      })

      // Idade mínima cairia em 2021-02-01; o intervalo empurra para outubro.
      expect(item.nextDoseDueFrom).toBe('2026-10-19')
      expect(item.status).toBe(VaccineScheduleStatus.FUTURA)
    })

    it('usa a idade mínima quando ela cai depois do intervalo', () => {
      const [item] = avaliar({
        birthDate: '2026-01-01',
        regras: [
          regra({ doseOrder: 1, minAgeMonths: 2 }),
          regra({ doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 24, minIntervalDays: 30 }),
        ],
        doses: [{ vaccineId: VACINA, appliedAt: '2026-03-01' }],
      })

      expect(item.nextDoseDueFrom).toBe('2028-01-01')
    })

    // A ordem das regras na entrada não deve importar.
    it('ordena as doses por doseOrder, não pela ordem recebida', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [
          regra({ doseLabel: '2ª dose', doseOrder: 2, minAgeMonths: 15 }),
          regra({ doseLabel: '1ª dose', doseOrder: 1, minAgeMonths: 12 }),
        ],
      })

      expect(item.nextDoseLabel).toBe('1ª dose')
    })
  })

  describe('recorte por sexo', () => {
    // Regra que não vale para a pessoa não é "não se aplica": é ausência de
    // dever, e a vacina nem aparece na lista.
    it('omite a vacina cuja regra é de outro sexo', () => {
      const resultado = avaliar({
        birthDate: '2010-01-01',
        gender: PatientGender.MALE,
        regras: [regra({ appliesToGender: PatientGender.FEMALE })],
      })

      expect(resultado).toHaveLength(0)
    })

    it('aplica a regra sem recorte a qualquer sexo', () => {
      const resultado = avaliar({
        birthDate: '2010-01-01',
        gender: PatientGender.MALE,
        regras: [regra({ appliesToGender: null })],
      })

      expect(resultado).toHaveLength(1)
    })
  })

  describe('decisão do profissional', () => {
    // O sistema informa, não prescreve: dispensar silencia a pendência.
    it('marca como não se aplica quando o profissional dispensou', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        decisions: [{ vaccineId: VACINA, decision: VaccineDecision.DISPENSADA }],
      })

      expect(item.status).toBe(VaccineScheduleStatus.NAO_SE_APLICA)
      expect(item.nextDoseLabel).toBeNull()
    })

    // Adiar tira do alerta sem apagar o dever: continua contando as doses.
    it('tira a pendência do alerta quando adiada, sem perder o histórico', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        decisions: [{ vaccineId: VACINA, decision: VaccineDecision.ADIADA }],
      })

      expect(item.status).toBe(VaccineScheduleStatus.FUTURA)
      expect(item.nextDoseLabel).toBe('1ª dose')
      expect(item.dosesExpected).toBe(1)
    })

    // Confirmar é reconhecer, não resolver: a dose segue pendente até ser dada.
    it('mantém a pendência quando a decisão foi confirmar', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        decisions: [{ vaccineId: VACINA, decision: VaccineDecision.CONFIRMADA }],
      })

      expect(item.status).toBe(VaccineScheduleStatus.PENDENTE)
    })

    it('não deixa a decisão de uma vacina afetar outra', () => {
      const resultado = avaliar({
        birthDate: '2020-01-01',
        regras: [regra(), regra({ vaccineId: 'v-2' })],
        decisions: [{ vaccineId: VACINA, decision: VaccineDecision.DISPENSADA }],
      })

      const outra = resultado.find((r) => r.vaccineId === 'v-2')
      expect(outra?.status).toBe(VaccineScheduleStatus.PENDENTE)
    })
  })

  describe('bordas de data', () => {
    // 31 de janeiro mais um mês não existe.
    it('não estoura o mês ao somar em data sem dia correspondente', () => {
      const [item] = avaliar({ birthDate: '2026-01-31', regras: [regra({ minAgeMonths: 1 })] })

      expect(item.nextDoseDueFrom).toBe('2026-02-28')
    })

    it('trata dose devida exatamente hoje como pendente, não futura', () => {
      const [item] = avaliar({ birthDate: '2025-09-04', regras: [regra({ minAgeMonths: 12 })] })

      expect(item.nextDoseDueFrom).toBe(HOJE)
      expect(item.status).toBe(VaccineScheduleStatus.PENDENTE)
    })

    it('trata dose ao nascer como devida desde o nascimento', () => {
      const [item] = avaliar({ birthDate: '2026-08-01', regras: [regra({ minAgeMonths: 0 })] })

      expect(item.nextDoseDueFrom).toBe('2026-08-01')
      expect(item.status).toBe(VaccineScheduleStatus.PENDENTE)
    })
  })

  describe('entradas degeneradas', () => {
    it('devolve lista vazia quando não há regras', () => {
      expect(avaliar({ birthDate: '2020-01-01', regras: [] })).toEqual([])
    })

    // Mais doses registradas que o esquema prevê acontece: reforço extra,
    // caderneta com transcrição duplicada. Não pode virar erro.
    it('trata excesso de doses como em dia', () => {
      const [item] = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        doses: [
          { vaccineId: VACINA, appliedAt: '2021-02-01' },
          { vaccineId: VACINA, appliedAt: '2022-02-01' },
        ],
      })

      expect(item.status).toBe(VaccineScheduleStatus.EM_DIA)
      expect(item.dosesTaken).toBe(2)
      expect(item.dosesExpected).toBe(1)
    })

    it('ignora doses de vacina que não está no calendário', () => {
      const resultado = avaliar({
        birthDate: '2020-01-01',
        regras: [regra()],
        doses: [{ vaccineId: 'fora-do-calendario', appliedAt: '2021-01-01' }],
      })

      expect(resultado).toHaveLength(1)
      expect(resultado[0].dosesTaken).toBe(0)
    })
  })
})
