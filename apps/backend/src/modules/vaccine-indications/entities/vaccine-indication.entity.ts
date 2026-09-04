import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { VaccineIndicationSnapshot } from '@app/shared'

@Entity('vaccine_indications')
export class VaccineIndication {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  // Obrigatório, ao contrário do registro de vacinação. Registrar é transcrever
  // o que a paciente já tomou, e isso pode não ter consulta; indicar é ato de
  // consulta, e o documento leva a assinatura de quem atendeu.
  @Column({ name: 'appointment_id', type: 'uuid' })
  appointmentId: string

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({ type: 'jsonb' })
  snapshot: VaccineIndicationSnapshot

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
