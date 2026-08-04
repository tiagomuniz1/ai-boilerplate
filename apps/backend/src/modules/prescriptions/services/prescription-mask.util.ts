// Máscaras aplicadas na verificação pública de receita.
// Objetivo: permitir que a farmácia confira o paciente contra o documento físico
// sem expor PII completo numa página acessível sem autenticação.

export function maskCpf(cpf: string | null): string {
  if (!cpf) return 'Não informado'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return '***'
  return `***.***.${digits.slice(6, 9)}-**`
}

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0]
  if (parts.length === 1) return `${first}.`
  const lastInitial = parts[parts.length - 1][0].toUpperCase()
  return `${first} ${lastInitial}.`
}
