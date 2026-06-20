import { QueryRunner } from 'typeorm'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'

export abstract class IMedicalRecordCanonicalFieldsRepository {
  abstract findForSuggestion(
    specialtyId: string | undefined,
    includeInactive: boolean,
  ): Promise<MedicalRecordCanonicalField[]>
  abstract findById(id: string): Promise<MedicalRecordCanonicalField | null>
  abstract findByCanonicalKey(canonicalKey: string): Promise<MedicalRecordCanonicalField | null>
  abstract create(
    data: Partial<MedicalRecordCanonicalField>,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordCanonicalField>
  abstract update(
    id: string,
    data: Partial<MedicalRecordCanonicalField>,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordCanonicalField>
}
