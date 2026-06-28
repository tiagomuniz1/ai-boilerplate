import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Test } from '@nestjs/testing'
import * as iconv from 'iconv-lite'
import { DataSource } from 'typeorm'
import { MedicationSource } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Medication } from '../../../modules/medications/entities/medication.entity'
import { importAnvisaMedications } from './import-anvisa-medications'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

const HEADER = [
  'TIPO_PRODUTO',
  'NOME_PRODUTO',
  'DATA_FINALIZACAO_PROCESSO',
  'CATEGORIA_REGULATORIA',
  'NUMERO_REGISTRO_PRODUTO',
  'DATA_VENCIMENTO_REGISTRO',
  'NUMERO_PROCESSO',
  'CLASSE_TERAPEUTICA',
  'EMPRESA_DETENTORA_REGISTRO',
  'SITUACAO_REGISTRO',
  'PRINCIPIO_ATIVO',
].join(';')

function row(values: string[]): string {
  return values.map((value) => `"${value}"`).join(';')
}

// One quoted record per "logical" line, accents included to exercise win1252 decoding.
const ASPIRIN = row([
  'MEDICAMENTO',
  'ÁCIDO ACETILSALICÍLICO',
  '02/02/2005',
  'Genérico',
  '111111111',
  '022030',
  '25351000000000001',
  'ANTIINFLAMATORIOS',
  '00000000000001 - INDÚSTRIA FARMACÊUTICA LTDA',
  'Ativo',
  'ácido acetilsalicílico',
])
const DIPYRONE = row([
  'MEDICAMENTO',
  'DIPIRONA SÓDICA',
  '02/02/2005',
  'Similar',
  '222222222',
  '022030',
  '25351000000000002',
  'ANALGESICOS',
  '00000000000002 - LABORATÓRIO XPTO S.A.',
  'Inativo',
  'dipirona sódica',
])
const NON_MEDICATION = row([
  'PRODUTO PARA SAUDE',
  'SERINGA DESCARTÁVEL',
  '02/02/2005',
  'BAIXO RISCO',
  '333333333',
  '022030',
  '',
  '',
  '00000000000003 - PLASTICOS LTDA',
  'Ativo',
  '',
])
const NO_NAME = row([
  'MEDICAMENTO',
  '',
  '02/02/2005',
  'Genérico',
  '',
  '',
  '',
  '',
  '00000000000004 - SEM NOME LTDA',
  'Ativo',
  '',
])

// ASPIRIN appears twice (duplicate identity) to verify in-file dedup.
const CSV_CONTENT = [HEADER, ASPIRIN, DIPYRONE, ASPIRIN, NON_MEDICATION, NO_NAME].join('\n')

describe('importAnvisaMedications (integration)', () => {
  let dataSource: DataSource
  let medicationRepository: ReturnType<DataSource['getRepository']>
  let fixturePath: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    dataSource = module.get(DataSource)
    medicationRepository = dataSource.getRepository(Medication)

    fixturePath = path.join(os.tmpdir(), `anvisa-medications-${Date.now()}.csv`)
    fs.writeFileSync(fixturePath, iconv.encode(CSV_CONTENT, 'win1252'))
  })

  afterAll(async () => {
    fs.rmSync(fixturePath, { force: true })
    await dataSource.destroy()
  })

  afterEach(async () => {
    await medicationRepository.query('DELETE FROM test.medications')
  })

  it('imports only medication rows with a name, decoding accents correctly', async () => {
    const result = await importAnvisaMedications(dataSource, { filePath: fixturePath, batchSize: 100 })

    expect(result.read).toBe(5)
    expect(result.skipped).toBe(2) // non-medication + missing name
    expect(result.imported).toBe(2) // aspirin (deduped) + dipyrone

    const medications = await medicationRepository.find({ order: { name: 'ASC' } })
    expect(medications).toHaveLength(2)

    const aspirin = medications.find((m) => m.name.startsWith('ÁCIDO'))
    expect(aspirin?.name).toBe('ÁCIDO ACETILSALICÍLICO')
    expect(aspirin?.holderCompany).toBe('00000000000001 - INDÚSTRIA FARMACÊUTICA LTDA')
    expect(aspirin?.source).toBe(MedicationSource.ANVISA)
    expect(aspirin?.isActive).toBe(true)
    expect(aspirin?.importHash).not.toBeNull()

    const dipyrone = medications.find((m) => m.name.startsWith('DIPIRONA'))
    expect(dipyrone?.isActive).toBe(false)
  })

  it('is idempotent — a second run updates rows without duplicating', async () => {
    await importAnvisaMedications(dataSource, { filePath: fixturePath, batchSize: 100 })
    const second = await importAnvisaMedications(dataSource, { filePath: fixturePath, batchSize: 100 })

    expect(second.imported).toBe(2)
    expect(await medicationRepository.count()).toBe(2)
  })

  it('respects the batch size, splitting the upserts into multiple transactions', async () => {
    const result = await importAnvisaMedications(dataSource, { filePath: fixturePath, batchSize: 1 })

    // One transaction per row that reaches the buffer (dedup only collapses within a
    // batch); ON CONFLICT still keeps the persisted set at 2 distinct medications.
    expect(result.batches).toBeGreaterThanOrEqual(2)
    expect(await medicationRepository.count()).toBe(2)
  })
})
