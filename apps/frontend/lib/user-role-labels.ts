import { UserRole } from '@app/shared'

/**
 * Display label for each access role (`UserRole`). Distinct from the user's
 * profession (councilType) — see `components/features/professionals/utils/profession-label.ts`.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.PROFESSIONAL]: 'Profissional',
  [UserRole.USER]: 'Recepcionista',
  [UserRole.PATIENT]: 'Paciente',
  [UserRole.PLATFORM_ADMIN]: 'Platform Admin',
}

/** What each access role can actually do, mirrored from ai/context/permissions.md. */
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]:
    'Acesso total: gerencia usuários, profissionais, pacientes, agendas e todas as consultas.',
  [UserRole.PROFESSIONAL]:
    'Gerencia a própria agenda e consultas. Não vê dados de outros profissionais.',
  [UserRole.USER]:
    'Consulta pacientes, profissionais e consultas (leitura). Não cria nem cancela consultas.',
  [UserRole.PATIENT]: 'Não acessa o sistema — apenas vinculado a consultas.',
  [UserRole.PLATFORM_ADMIN]: 'Gerencia o backoffice da plataforma (catálogos, medicamentos).',
}
