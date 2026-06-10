import { QueryFailedError } from 'typeorm'

export const DB_UNIQUE_CONSTRAINTS = {
  USERS_EMAIL: 'UQ_users_email_active',
  DOCTORS_CRM: 'doctors_crm_number_clinic_active_unique',
  DOCTORS_USER_ID: 'doctors_user_id_clinic_active_unique',
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
