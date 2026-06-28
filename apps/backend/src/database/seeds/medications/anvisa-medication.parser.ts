import { createHash } from 'crypto'
import { MedicationSource } from '@app/shared'
import { CreateMedicationData } from '../../../modules/medications/repositories/medications.repository.interface'

/**
 * Raw shape of a row from the ANVISA "Dados Abertos — Medicamentos" CSV
 * (semicolon separated, header columns in upper snake case).
 */
export interface AnvisaCsvRow {
  TIPO_PRODUTO?: string
  NOME_PRODUTO?: string
  CATEGORIA_REGULATORIA?: string
  NUMERO_REGISTRO_PRODUTO?: string
  CLASSE_TERAPEUTICA?: string
  EMPRESA_DETENTORA_REGISTRO?: string
  SITUACAO_REGISTRO?: string
  PRINCIPIO_ATIVO?: string
  [key: string]: string | undefined
}

const MEDICATION_PRODUCT_TYPE = 'MEDICAMENTO'
const ACTIVE_STATUS = 'ativo'

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const HTML_ENTITY_PATTERN = /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g

/**
 * Decodes HTML character references found in some ANVISA fields, e.g.
 * "&#193;LCOOL ET&#205;LICO" → "ÁLCOOL ETÍLICO". Handles decimal (`&#193;`),
 * hexadecimal (`&#xC1;`) and the common named entities. Unknown references are
 * left untouched. Single-pass, so it never re-decodes its own output.
 */
export function decodeHtmlEntities(value: string): string {
  return value.replace(HTML_ENTITY_PATTERN, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** Decodes HTML entities, trims a raw cell and collapses empty strings to null. */
export function cleanValue(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const cleaned = decodeHtmlEntities(value).trim()
  return cleaned.length > 0 ? cleaned : null
}

function normalizeForHash(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * Deterministic dedup key. NUMERO_REGISTRO_PRODUTO alone is unreliable (it can be
 * empty and repeats per manufacturer/country), so the hash combines the
 * meaningful identity columns.
 */
export function computeImportHash(parts: {
  name: string
  registrationNumber: string | null
  holderCompany: string | null
  activeIngredient: string | null
}): string {
  const payload = [
    normalizeForHash(parts.name),
    normalizeForHash(parts.registrationNumber),
    normalizeForHash(parts.holderCompany),
    normalizeForHash(parts.activeIngredient),
  ].join('|')

  return createHash('sha256').update(payload).digest('hex')
}

/**
 * Maps a raw CSV row to a persistable medication, or null when the row should be
 * skipped (non-medication product type or missing name).
 */
export function parseAnvisaRow(row: AnvisaCsvRow): CreateMedicationData | null {
  const productType = cleanValue(row.TIPO_PRODUTO)
  if (!productType || productType.toUpperCase() !== MEDICATION_PRODUCT_TYPE) return null

  const name = cleanValue(row.NOME_PRODUTO)
  if (!name) return null

  const activeIngredient = cleanValue(row.PRINCIPIO_ATIVO)
  const regulatoryCategory = cleanValue(row.CATEGORIA_REGULATORIA)
  const therapeuticClass = cleanValue(row.CLASSE_TERAPEUTICA)
  const holderCompany = cleanValue(row.EMPRESA_DETENTORA_REGISTRO)
  const registrationNumber = cleanValue(row.NUMERO_REGISTRO_PRODUTO)
  const registrationStatus = cleanValue(row.SITUACAO_REGISTRO)

  return {
    name,
    activeIngredient,
    regulatoryCategory,
    therapeuticClass,
    holderCompany,
    registrationNumber,
    registrationStatus,
    source: MedicationSource.ANVISA,
    importHash: computeImportHash({ name, registrationNumber, holderCompany, activeIngredient }),
    isActive: (registrationStatus ?? '').toLowerCase() === ACTIVE_STATUS,
  }
}
