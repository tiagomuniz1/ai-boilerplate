import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MedicationSource } from '@app/shared'

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Serves ORDER BY name (default listing) and the early-stop path for common search terms.
  // Substring search (ILIKE '%term%') is handled by GIN trigram indexes defined in the
  // add-medications-trigram-indexes migration (gin_trgm_ops can't be expressed via @Index).
  @Index('IDX_medications_name')
  @Column({ length: 250 })
  name: string

  @Column({ name: 'active_ingredient', type: 'varchar', length: 500, nullable: true })
  activeIngredient: string | null

  @Column({ name: 'regulatory_category', type: 'varchar', length: 120, nullable: true })
  regulatoryCategory: string | null

  @Column({ name: 'therapeutic_class', type: 'varchar', length: 250, nullable: true })
  therapeuticClass: string | null

  @Column({ name: 'holder_company', type: 'varchar', length: 250, nullable: true })
  holderCompany: string | null

  @Column({ name: 'registration_number', type: 'varchar', length: 40, nullable: true })
  registrationNumber: string | null

  @Column({ name: 'registration_status', type: 'varchar', length: 40, nullable: true })
  registrationStatus: string | null

  @Column({ type: 'varchar', length: 20, default: MedicationSource.MANUAL })
  source: MedicationSource

  // Deduplication key for the ANVISA import (sha256). Manual entries keep it null;
  // PostgreSQL treats nulls as distinct, so the partial unique index never collides on them.
  @Column({ name: 'import_hash', type: 'varchar', length: 64, nullable: true })
  importHash: string | null

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
