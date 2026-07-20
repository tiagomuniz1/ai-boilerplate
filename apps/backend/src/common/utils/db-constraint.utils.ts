import { QueryFailedError } from 'typeorm'

export const DB_UNIQUE_CONSTRAINTS = {
  USERS_EMAIL_PLATFORM_ADMIN: 'UQ_users_email_platform_admin',
  USERS_EMAIL_CLINIC: 'UQ_users_email_clinic',
  PROFESSIONAL_REGISTRATIONS: 'professional_registrations_council_number_state_clinic_active_unique',
  PROFESSIONALS_USER_ID: 'professionals_user_id_clinic_active_unique',
  PATIENTS_DOCUMENT: 'patients_document_number_clinic_active_unique',
  CLINICS_SLUG: 'clinics_slug_unique',
} as const

export function isUniqueConstraintViolation(error: unknown, constraint: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as any).code === '23505' &&
    (error as any).constraint === constraint
  )
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof QueryFailedError && (error as any).code === '23503'
}
