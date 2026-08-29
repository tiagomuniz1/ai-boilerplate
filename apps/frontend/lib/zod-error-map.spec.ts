import { z } from 'zod'
import { ptBrErrorMap } from './zod-error-map'

// jest.setup.ts installs the map globally; these parse with it explicitly so the
// spec states what it is testing instead of relying on setup order.
function messageFor(schema: z.ZodTypeAny, value: unknown): string {
  const result = schema.safeParse(value, { errorMap: ptBrErrorMap })
  if (result.success) throw new Error('expected the value to fail validation')
  return result.error.issues[0].message
}

enum Weekday {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
}

describe('ptBrErrorMap', () => {
  it('reports a missing value as required', () => {
    expect(messageFor(z.string(), undefined)).toBe('Campo obrigatório')
  })

  it('reports a null value as required', () => {
    expect(messageFor(z.string(), null)).toBe('Campo obrigatório')
  })

  it('reports a wrong type as invalid', () => {
    expect(messageFor(z.string(), 42)).toBe('Valor inválido')
  })

  // A <select> with an empty first option submits '', which zod treats as an
  // invalid enum value — and would otherwise print every accepted value.
  it('never leaks the accepted enum values', () => {
    const message = messageFor(z.nativeEnum(Weekday), '')
    expect(message).toBe('Selecione uma opção válida')
    expect(message).not.toContain('MONDAY')
  })

  it('treats an empty string against min(1) as required', () => {
    expect(messageFor(z.string().min(1), '')).toBe('Campo obrigatório')
  })

  it('names the minimum length for a longer requirement', () => {
    expect(messageFor(z.string().min(3), 'ab')).toBe('Deve ter no mínimo 3 caracteres')
  })

  it('names the maximum length', () => {
    expect(messageFor(z.string().max(2), 'abc')).toBe('Deve ter no máximo 2 caracteres')
  })

  it('phrases array bounds as a selection', () => {
    expect(messageFor(z.array(z.string()).min(2), ['a'])).toBe('Selecione ao menos 2')
    expect(messageFor(z.array(z.string()).max(1), ['a', 'b'])).toBe('Selecione no máximo 1')
  })

  it('phrases number bounds without mentioning characters', () => {
    expect(messageFor(z.number().min(15), 10)).toBe('Deve ser no mínimo 15')
    expect(messageFor(z.number().max(120), 300)).toBe('Deve ser no máximo 120')
  })

  it('names the string format that failed', () => {
    expect(messageFor(z.string().email(), 'nope')).toBe('E-mail inválido')
    expect(messageFor(z.string().url(), 'nope')).toBe('URL inválida')
    expect(messageFor(z.string().uuid(), 'nope')).toBe('Identificador inválido')
    expect(messageFor(z.string().regex(/^\d+$/), 'abc')).toBe('Formato inválido')
  })

  it('falls back to a generic message rather than the English default', () => {
    const message = messageFor(z.string().refine(() => false), 'anything')
    expect(message).toBe('Valor inválido')
  })

  it('leaves a message written on the schema untouched', () => {
    expect(messageFor(z.string().min(1, 'Nome obrigatório'), '')).toBe('Nome obrigatório')
  })

  it('reports an invalid date', () => {
    expect(messageFor(z.date(), new Date('not a date'))).toBe('Data inválida')
  })
})
