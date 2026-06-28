import * as fs from 'fs'
import axios from 'axios'
import * as iconv from 'iconv-lite'
import { parse } from 'csv-parse'
import { DataSource } from 'typeorm'
import { Medication } from '../../../modules/medications/entities/medication.entity'
import { MedicationsRepository } from '../../../modules/medications/repositories/medications.repository'
import { CreateMedicationData } from '../../../modules/medications/repositories/medications.repository.interface'
import { AnvisaCsvRow, parseAnvisaRow } from './anvisa-medication.parser'

export const ANVISA_MEDICATIONS_URL =
  'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv'

const DEFAULT_BATCH_SIZE = 1000
const DOWNLOAD_TIMEOUT_MS = 120000

export interface ImportAnvisaOptions {
  /** Import from a local file instead of downloading (useful for tests / reprocessing). */
  filePath?: string
  /** Override the download URL. Ignored when filePath is provided. */
  url?: string
  batchSize?: number
  logger?: (message: string) => void
}

export interface ImportAnvisaResult {
  read: number
  imported: number
  skipped: number
  batches: number
}

async function loadCsvBuffer(options: ImportAnvisaOptions): Promise<Buffer> {
  if (options.filePath) {
    return fs.promises.readFile(options.filePath)
  }

  const url = options.url ?? ANVISA_MEDICATIONS_URL
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
  })
  return Buffer.from(response.data)
}

/**
 * Downloads (or reads) the ANVISA open-data medications CSV, decodes it from
 * Windows-1252 to UTF-8, parses it and upserts the rows in batches.
 *
 * Idempotent: dedup happens by `import_hash` (ON CONFLICT DO UPDATE), so running
 * it repeatedly refreshes the existing rows instead of duplicating them.
 */
export async function importAnvisaMedications(
  dataSource: DataSource,
  options: ImportAnvisaOptions = {},
): Promise<ImportAnvisaResult> {
  const log = options.logger ?? (() => {})
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const repository = new MedicationsRepository(dataSource.getRepository(Medication))

  const buffer = await loadCsvBuffer(options)
  const content = iconv.decode(buffer, 'win1252')

  const parser = parse(content, {
    columns: true,
    delimiter: ';',
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  })

  const result: ImportAnvisaResult = { read: 0, imported: 0, skipped: 0, batches: 0 }
  // Keyed by import_hash so duplicate rows within the same batch collapse — a single
  // INSERT ... ON CONFLICT statement cannot affect the same conflicting row twice.
  let batch = new Map<string, CreateMedicationData>()

  const flush = async (): Promise<void> => {
    if (batch.size === 0) return

    const rows = Array.from(batch.values())
    const queryRunner = dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      await repository.bulkUpsert(rows, queryRunner)
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }

    result.imported += rows.length
    result.batches += 1
    batch = new Map()
    log(`[import-medications] Upserted batch ${result.batches} (${result.imported} rows so far)`)
  }

  for await (const record of parser as AsyncIterable<AnvisaCsvRow>) {
    result.read += 1
    const parsed = parseAnvisaRow(record)
    if (!parsed) {
      result.skipped += 1
      continue
    }
    batch.set(parsed.importHash as string, parsed)
    if (batch.size >= batchSize) await flush()
  }
  await flush()

  log(
    `[import-medications] Done. read=${result.read} imported=${result.imported} ` +
      `skipped=${result.skipped} batches=${result.batches}`,
  )
  return result
}
