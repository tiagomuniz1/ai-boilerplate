import { z } from 'zod'

/**
 * Portuguese fallback messages for zod.
 *
 * Zod only consults an error map when a schema does not carry its own `message`,
 * so this never overrides a message the schema author wrote — it replaces the
 * English defaults that surface wherever one was not written. Without it, a
 * field that forgets a message shows the raw library text to the user, which
 * for enums includes the internal values (`Expected 'MONDAY' | 'TUESDAY' | …`).
 */
export const ptBrErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message: issue.received === 'undefined' || issue.received === 'null'
          ? 'Campo obrigatório'
          : 'Valor inválido',
      }

    // Reached when a <select> submits its empty option: the value is '' rather
    // than undefined, so `required_error` never fires and zod would otherwise
    // print the full list of accepted values.
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Selecione uma opção válida' }

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? { message: 'Campo obrigatório' }
          : { message: `Deve ter no mínimo ${issue.minimum} caracteres` }
      }
      if (issue.type === 'array') {
        return { message: `Selecione ao menos ${issue.minimum}` }
      }
      return { message: `Deve ser no mínimo ${issue.minimum}` }

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Deve ter no máximo ${issue.maximum} caracteres` }
      }
      if (issue.type === 'array') {
        return { message: `Selecione no máximo ${issue.maximum}` }
      }
      return { message: `Deve ser no máximo ${issue.maximum}` }

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' }
      if (issue.validation === 'url') return { message: 'URL inválida' }
      if (issue.validation === 'uuid') return { message: 'Identificador inválido' }
      return { message: 'Formato inválido' }

    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida' }

    default:
      // Deliberately not `ctx.defaultError` — that is the English text this map
      // exists to keep off the screen.
      return { message: 'Valor inválido' }
  }
}

export function installZodErrorMap(): void {
  z.setErrorMap(ptBrErrorMap)
}
