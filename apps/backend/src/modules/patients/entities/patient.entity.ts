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
import { KinshipType, PatientGender } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @Column({ name: 'document_number', type: 'char', length: 11, nullable: true })
  documentNumber: string | null

  @Column({ name: 'phone_number' })
  phoneNumber: string

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string

  @Column({ type: 'varchar' })
  gender: PatientGender

  @ManyToOne(() => Patient, { eager: false, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_patient_id' })
  responsiblePatient: Patient | null

  @Column({ name: 'responsible_patient_id', type: 'uuid', nullable: true })
  responsiblePatientId: string | null

  @Column({ name: 'kinship_type', type: 'varchar', length: 20, nullable: true })
  kinshipType: KinshipType | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
