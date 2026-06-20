import { generateFieldKey, slugifyLabel } from './generate-field-key.util'

describe('slugifyLabel', () => {
  it('converts a label to a snake_case slug', () => {
    expect(slugifyLabel('Blood Pressure')).toBe('blood_pressure')
  })

  it('removes accents/diacritics', () => {
    expect(slugifyLabel('Pressão Arterial')).toBe('pressao_arterial')
    expect(slugifyLabel('Temperatura (°C)')).toBe('temperatura_c')
  })

  it('collapses non-alphanumeric runs into a single underscore', () => {
    expect(slugifyLabel('Peso / Altura --- corporal')).toBe('peso_altura_corporal')
  })

  it('trims leading and trailing underscores', () => {
    expect(slugifyLabel('  ***Queixa***  ')).toBe('queixa')
  })

  it('returns empty string for a label without alphanumeric characters', () => {
    expect(slugifyLabel('***')).toBe('')
  })

  it('truncates very long labels', () => {
    const result = slugifyLabel('a'.repeat(100))
    expect(result.length).toBeLessThanOrEqual(40)
  })
})

describe('generateFieldKey', () => {
  it('generates a key from the label with a short suffix', () => {
    const used = new Set<string>()
    const key = generateFieldKey('Blood Pressure', used)
    expect(key).toMatch(/^blood_pressure_[a-z0-9]{4}$/)
  })

  it('registers the generated key in the used set', () => {
    const used = new Set<string>()
    const key = generateFieldKey('Weight', used)
    expect(used.has(key)).toBe(true)
  })

  it('falls back to "field" when the label has no slug', () => {
    const key = generateFieldKey('***', new Set())
    expect(key).toMatch(/^field_[a-z0-9]{4}$/)
  })

  it('generates unique keys for the same label', () => {
    const used = new Set<string>()
    const first = generateFieldKey('Weight', used)
    const second = generateFieldKey('Weight', used)
    expect(first).not.toBe(second)
  })

  it('retries when the first generated key collides with an existing one', () => {
    const used = new Set<string>(['x_aaaa'])
    // First suffix resolves to "aaaa" (collision), second to "aaab" (free).
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.04)

    const key = generateFieldKey('x', used)

    expect(key).toBe('x_aaab')
    expect(used.has('x_aaab')).toBe(true)
    randomSpy.mockRestore()
  })
})
