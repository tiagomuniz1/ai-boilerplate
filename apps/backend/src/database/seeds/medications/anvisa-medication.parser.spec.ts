import { MedicationSource } from '@app/shared'
import {
  AnvisaCsvRow,
  cleanValue,
  computeImportHash,
  decodeHtmlEntities,
  parseAnvisaRow,
} from './anvisa-medication.parser'

function makeRow(overrides: Partial<AnvisaCsvRow> = {}): AnvisaCsvRow {
  return {
    TIPO_PRODUTO: 'MEDICAMENTO',
    NOME_PRODUTO: 'DIPIRONA SODICA',
    CATEGORIA_REGULATORIA: 'Genérico',
    NUMERO_REGISTRO_PRODUTO: '126750053',
    CLASSE_TERAPEUTICA: 'ANALGESICOS',
    EMPRESA_DETENTORA_REGISTRO: '72593791000111 - NOVA QUIMICA',
    SITUACAO_REGISTRO: 'Ativo',
    PRINCIPIO_ATIVO: 'dipirona sódica',
    ...overrides,
  }
}

describe('decodeHtmlEntities', () => {
  it('decodes decimal numeric references', () => {
    expect(decodeHtmlEntities('&#193;LCOOL ET&#205;LICO 70%')).toBe('ÁLCOOL ETÍLICO 70%')
  })

  it('decodes references outside Latin-1 (e.g. typographic apostrophe)', () => {
    expect(decodeHtmlEntities('D&#8217;AGUA')).toBe('D’AGUA')
  })

  it('decodes hexadecimal references (case-insensitive)', () => {
    expect(decodeHtmlEntities('&#xC1;gua')).toBe('Água')
    expect(decodeHtmlEntities('&#Xc1;gua')).toBe('Água')
  })

  it('decodes common named entities and leaves unknown ones untouched', () => {
    expect(decodeHtmlEntities('A &amp; B &lt;x&gt; &quot;y&quot; &apos;z&apos;')).toBe(
      'A & B <x> "y" \'z\'',
    )
    expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;')
  })

  it('leaves out-of-range / invalid numeric references untouched', () => {
    expect(decodeHtmlEntities('&#1114112;')).toBe('&#1114112;')
  })

  it('returns plain text unchanged', () => {
    expect(decodeHtmlEntities('DIPIRONA SODICA')).toBe('DIPIRONA SODICA')
  })
})

describe('cleanValue', () => {
  it('trims and returns the value', () => {
    expect(cleanValue('  Dipirona  ')).toBe('Dipirona')
  })

  it('decodes HTML entities before trimming', () => {
    expect(cleanValue('  &#193;LCOOL ET&#205;LICO 70%  ')).toBe('ÁLCOOL ETÍLICO 70%')
  })

  it('returns null for empty, whitespace, null and undefined', () => {
    expect(cleanValue('')).toBeNull()
    expect(cleanValue('   ')).toBeNull()
    expect(cleanValue(null)).toBeNull()
    expect(cleanValue(undefined)).toBeNull()
  })
})

describe('computeImportHash', () => {
  const base = {
    name: 'Dipirona',
    registrationNumber: '123',
    holderCompany: 'ACME',
    activeIngredient: 'dipirona',
  }

  it('is deterministic for the same input', () => {
    expect(computeImportHash(base)).toBe(computeImportHash(base))
  })

  it('is case- and whitespace-insensitive (normalized)', () => {
    const noisy = {
      name: '  DIPIRONA ',
      registrationNumber: '123',
      holderCompany: 'acme',
      activeIngredient: 'DIPIRONA',
    }
    expect(computeImportHash(noisy)).toBe(computeImportHash(base))
  })

  it('treats null fields as empty strings', () => {
    const hash = computeImportHash({
      name: 'Dipirona',
      registrationNumber: null,
      holderCompany: null,
      activeIngredient: null,
    })
    expect(hash).toHaveLength(64)
  })

  it('changes when a meaningful field changes', () => {
    expect(computeImportHash({ ...base, holderCompany: 'OTHER' })).not.toBe(computeImportHash(base))
  })
})

describe('parseAnvisaRow', () => {
  it('maps a valid medication row', () => {
    const result = parseAnvisaRow(makeRow())

    expect(result).toEqual({
      name: 'DIPIRONA SODICA',
      activeIngredient: 'dipirona sódica',
      regulatoryCategory: 'Genérico',
      therapeuticClass: 'ANALGESICOS',
      holderCompany: '72593791000111 - NOVA QUIMICA',
      registrationNumber: '126750053',
      registrationStatus: 'Ativo',
      source: MedicationSource.ANVISA,
      importHash: expect.any(String),
      isActive: true,
    })
  })

  it('decodes HTML entities in the product name and active ingredient', () => {
    const result = parseAnvisaRow(
      makeRow({
        NOME_PRODUTO: '&#193;LCOOL ET&#205;LICO 70% - &#193;LCOOL ET&#205;LICO 70% CELESTE',
        PRINCIPIO_ATIVO: '&#193;LCOOL ET&#205;LICO',
      }),
    )

    expect(result?.name).toBe('ÁLCOOL ETÍLICO 70% - ÁLCOOL ETÍLICO 70% CELESTE')
    expect(result?.activeIngredient).toBe('ÁLCOOL ETÍLICO')
  })

  it('hashes the decoded value, so encoded and decoded rows dedup to the same key', () => {
    const encoded = parseAnvisaRow(makeRow({ NOME_PRODUTO: '&#193;LCOOL ET&#205;LICO' }))
    const decoded = parseAnvisaRow(makeRow({ NOME_PRODUTO: 'ÁLCOOL ETÍLICO' }))

    expect(encoded?.importHash).toBe(decoded?.importHash)
  })

  it('nulls out empty optional fields', () => {
    const result = parseAnvisaRow(
      makeRow({ PRINCIPIO_ATIVO: '', NUMERO_REGISTRO_PRODUTO: '   ' }),
    )

    expect(result?.activeIngredient).toBeNull()
    expect(result?.registrationNumber).toBeNull()
  })

  it('flags isActive false when the registration status is not "Ativo"', () => {
    expect(parseAnvisaRow(makeRow({ SITUACAO_REGISTRO: 'Inativo' }))?.isActive).toBe(false)
  })

  it('treats the active status case-insensitively', () => {
    expect(parseAnvisaRow(makeRow({ SITUACAO_REGISTRO: 'ATIVO' }))?.isActive).toBe(true)
  })

  it('produces the same hash for two identical rows', () => {
    const a = parseAnvisaRow(makeRow())
    const b = parseAnvisaRow(makeRow())
    expect(a?.importHash).toBe(b?.importHash)
  })

  it('skips rows whose product type is not MEDICAMENTO', () => {
    expect(parseAnvisaRow(makeRow({ TIPO_PRODUTO: 'PRODUTO PARA SAUDE' }))).toBeNull()
  })

  it('skips rows with a missing product type', () => {
    expect(parseAnvisaRow(makeRow({ TIPO_PRODUTO: '' }))).toBeNull()
  })

  it('skips rows without a product name', () => {
    expect(parseAnvisaRow(makeRow({ NOME_PRODUTO: '   ' }))).toBeNull()
  })
})
