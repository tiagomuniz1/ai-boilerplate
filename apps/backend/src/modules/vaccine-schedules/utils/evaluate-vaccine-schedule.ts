import { PatientGender, VaccineDecision, VaccineScheduleStatus } from '@app/shared'

/**
 * O motor de status: dadas a idade e o sexo do paciente, as regras ativas do
 * calendário e as doses já registradas, diz o que falta.
 *
 * É função pura, sem I/O, de propósito — esta é a peça que faz afirmação
 * clínica, e precisa ser testável exaustivamente. E ela **sugere**: quem decide
 * é o profissional, através das decisões registradas, que entram aqui como
 * `decisions` e podem silenciar uma pendência.
 */

export interface RegraAvaliavel {
  vaccineId: string
  doseLabel: string
  doseOrder: number
  minAgeMonths: number
  maxAgeMonths: number | null
  minIntervalDays: number | null
  appliesToGender: PatientGender | null
}

export interface DoseRegistrada {
  vaccineId: string
  appliedAt: string
}

export interface DecisaoRegistrada {
  vaccineId: string
  decision: VaccineDecision
}

export interface StatusCalculado {
  vaccineId: string
  status: VaccineScheduleStatus
  nextDoseLabel: string | null
  nextDoseDueFrom: string | null
  dosesTaken: number
  dosesExpected: number
}

export function idadeEmMeses(birthDate: string, hoje: string): number {
  const [anoN, mesN, diaN] = birthDate.split('-').map(Number)
  const [anoH, mesH, diaH] = hoje.split('-').map(Number)
  let meses = (anoH - anoN) * 12 + (mesH - mesN)
  // O mês só conta quando o dia do aniversário já passou.
  if (diaH < diaN) meses -= 1
  return Math.max(0, meses)
}

function somarDias(date: string, dias: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function somarMeses(date: string, meses: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  const dia = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + meses)
  // 31 de janeiro + 1 mês não existe: cai no último dia de fevereiro.
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimoDia))
  return d.toISOString().slice(0, 10)
}

export function evaluateVaccineSchedule(params: {
  birthDate: string
  gender: PatientGender
  hoje: string
  regras: RegraAvaliavel[]
  doses: DoseRegistrada[]
  decisions: DecisaoRegistrada[]
}): StatusCalculado[] {
  const { birthDate, gender, hoje, regras, doses, decisions } = params
  const idade = idadeEmMeses(birthDate, hoje)

  const porVacina = new Map<string, RegraAvaliavel[]>()
  for (const regra of regras) {
    // Uma regra com recorte de sexo simplesmente não existe para quem está
    // fora dele — não é "não se aplica", é ausência de dever.
    if (regra.appliesToGender && regra.appliesToGender !== gender) continue
    const lista = porVacina.get(regra.vaccineId) ?? []
    lista.push(regra)
    porVacina.set(regra.vaccineId, lista)
  }

  const dosesPorVacina = new Map<string, string[]>()
  for (const dose of doses) {
    const lista = dosesPorVacina.get(dose.vaccineId) ?? []
    lista.push(dose.appliedAt)
    dosesPorVacina.set(dose.vaccineId, lista)
  }

  const decisaoPorVacina = new Map(decisions.map((d) => [d.vaccineId, d.decision]))

  const resultado: StatusCalculado[] = []

  for (const [vaccineId, regrasDaVacina] of porVacina) {
    const ordenadas = [...regrasDaVacina].sort((a, b) => a.doseOrder - b.doseOrder)
    const tomadas = (dosesPorVacina.get(vaccineId) ?? []).sort()
    const dosesTaken = tomadas.length
    const dosesExpected = ordenadas.length

    const decisao = decisaoPorVacina.get(vaccineId)
    if (decisao === VaccineDecision.DISPENSADA) {
      resultado.push({
        vaccineId,
        status: VaccineScheduleStatus.NAO_SE_APLICA,
        nextDoseLabel: null,
        nextDoseDueFrom: null,
        dosesTaken,
        dosesExpected,
      })
      continue
    }

    // A próxima dose devida é a de ordem seguinte à quantidade já tomada. É uma
    // simplificação consciente: o sistema não tenta casar cada dose registrada
    // com a regra correspondente, porque o rótulo é texto livre e a caderneta
    // transcrita raramente traz a sequência completa.
    const proxima = ordenadas[dosesTaken]

    if (!proxima) {
      resultado.push({
        vaccineId,
        status: VaccineScheduleStatus.EM_DIA,
        nextDoseLabel: null,
        nextDoseDueFrom: null,
        dosesTaken,
        dosesExpected,
      })
      continue
    }

    // Devida a partir da idade mínima, ou do intervalo desde a última dose —
    // o que vier depois.
    const porIdade = somarMeses(birthDate, proxima.minAgeMonths)
    const ultimaDose = tomadas[tomadas.length - 1]
    const porIntervalo =
      ultimaDose && proxima.minIntervalDays !== null && proxima.minIntervalDays !== undefined
        ? somarDias(ultimaDose, proxima.minIntervalDays)
        : null
    const dueFrom = porIntervalo && porIntervalo > porIdade ? porIntervalo : porIdade

    let status: VaccineScheduleStatus
    if (dueFrom > hoje) {
      status = VaccineScheduleStatus.FUTURA
    } else if (proxima.maxAgeMonths !== null && idade > proxima.maxAgeMonths) {
      status = VaccineScheduleStatus.ATRASADA
    } else {
      status = VaccineScheduleStatus.PENDENTE
    }

    // Adiada silencia o alerta sem apagar a pendência: continua devida, mas o
    // profissional já olhou e decidiu.
    if (decisao === VaccineDecision.ADIADA && status === VaccineScheduleStatus.PENDENTE) {
      status = VaccineScheduleStatus.FUTURA
    }

    resultado.push({
      vaccineId,
      status,
      nextDoseLabel: proxima.doseLabel,
      nextDoseDueFrom: dueFrom,
      dosesTaken,
      dosesExpected,
    })
  }

  return resultado
}
