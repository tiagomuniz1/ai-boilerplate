import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MedicalCertificateSnapshot } from '@app/shared'

@Entity('medical_certificates')
export class MedicalCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId: string

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string

  @Column({ type: 'jsonb' })
  snapshot: MedicalCertificateSnapshot

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
