import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { Professional } from '../../professionals/entities/professional.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { MedicalRecordTemplateField } from '../../medical-record-templates/entities/medical-record-template.entity'

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId: string

  @ManyToOne(() => Patient, { eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string

  @ManyToOne(() => Professional, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Professional

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string

  @ManyToOne(() => Specialty, { eager: false })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty | null

  @Column({ name: 'specialty_id', type: 'uuid', nullable: true })
  specialtyId: string | null

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string

  @Column({ name: 'template_schema_snapshot', type: 'jsonb' })
  templateSchemaSnapshot: MedicalRecordTemplateField[]

  @Column({ type: 'jsonb', default: () => "'{}'" })
  data: Record<string, unknown>

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
