import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { Vaccine } from '../../modules/vaccines/entities/vaccine.entity'
import { VaccineScheduleRule } from '../../modules/vaccine-schedules/entities/vaccine-schedule-rule.entity'
import { VACCINES } from './vaccines/vaccines'
import { VACCINE_SCHEDULE_RULES } from './vaccines/vaccine-schedule-rules'

// Publica o catálogo de vacinas e o Calendário Nacional no banco configurado.
//
// O seed (`seed:run`) não roda em produção — é a regra do projeto —, mas o
// módulo de vacinas é inerte sem estes dados: sem catálogo não há o que
// registrar nem indicar, e sem as regras a situação vacinal não calcula nada.
// Daí este importador, no mesmo molde de medications, themes e canonical-fields.
//
// Idempotente nas duas tabelas: vacina existente é reconhecida pelo nome e
// deixada como está (o backoffice edita o catálogo, e sobrescrever apagaria a
// curadoria da clínica); regra é reconhecida pelo par (vacina, ordem da dose),
// que é o índice único da tabela.
async function run(): Promise<void> {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  const vaccinesRepository = dataSource.getRepository(Vaccine)
  const rulesRepository = dataSource.getRepository(VaccineScheduleRule)

  let vaccinesCreated = 0
  let vaccinesSkipped = 0
  let rulesCreated = 0
  let rulesSkipped = 0

  try {
    for (const data of VACCINES) {
      const existing = await vaccinesRepository.findOneBy({ name: data.name })
      if (existing) {
        vaccinesSkipped += 1
        continue
      }

      await vaccinesRepository.save(
        vaccinesRepository.create({
          name: data.name,
          abbreviation: data.abbreviation,
          preventedDiseases: data.preventedDiseases,
          isActive: true,
        }),
      )
      vaccinesCreated += 1
      console.log(`[run-import-vaccines] vacina "${data.name}" criada`)
    }

    // As regras referenciam a vacina por nome. Se uma não existir, a regra é
    // pulada com aviso alto em vez de derrubar a importação: melhor um
    // calendário incompleto e visível do que metade das vacinas sem catálogo.
    for (const data of VACCINE_SCHEDULE_RULES) {
      const vaccine = await vaccinesRepository.findOneBy({ name: data.vaccineName })
      if (!vaccine) {
        console.warn(
          `[run-import-vaccines] AVISO: regra "${data.doseLabel}" ignorada — vacina "${data.vaccineName}" não está no catálogo`,
        )
        continue
      }

      const existing = await rulesRepository.findOneBy({
        vaccineId: vaccine.id,
        doseOrder: data.doseOrder,
      })
      if (existing) {
        rulesSkipped += 1
        continue
      }

      await rulesRepository.save(
        rulesRepository.create({
          vaccineId: vaccine.id,
          doseLabel: data.doseLabel,
          doseOrder: data.doseOrder,
          minAgeMonths: data.minAgeMonths,
          maxAgeMonths: data.maxAgeMonths ?? null,
          minIntervalDays: data.minIntervalDays ?? null,
          appliesToGender: data.appliesToGender ?? null,
          isActive: true,
        }),
      )
      rulesCreated += 1
      console.log(`[run-import-vaccines] regra "${data.vaccineName} — ${data.doseLabel}" criada`)
    }

    console.log(
      `[run-import-vaccines] Concluído. ` +
        `vacinas: total=${VACCINES.length} criadas=${vaccinesCreated} existentes=${vaccinesSkipped} | ` +
        `regras: total=${VACCINE_SCHEDULE_RULES.length} criadas=${rulesCreated} existentes=${rulesSkipped}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-import-vaccines] Falhou:', err)
    process.exit(1)
  })
