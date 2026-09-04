import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Professional } from '../../professionals/entities/professional.entity'
import { Vaccine } from '../../vaccines/entities/vaccine.entity'

/**
 * Uma dose registrada na caderneta do paciente.
 *
 * A âncora é o PACIENTE, não a consulta — e é aí que esta entidade se afasta
 * do resto do sistema, onde tudo nasce dentro de um atendimento. Uma dose
 * tomada há dez anos num posto de saúde não tem consulta a que se amarrar, e
 * inventar uma seria pior do que aceitar o nulo.
 *
 * Quando o registro acontece durante um atendimento, `appointment_id` é
 * gravado e dá rastreabilidade. `recorded_by_professional_id` é sempre
 * obrigatório: alguém com ficha respondeu por aquele registro.
 */
@Entity('vaccinations')
@Index('IDX_vaccinations_patient_applied_at', ['patientId', 'appliedAt'])
export class Vaccination {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string

  @Column({ name: 'vaccine_id', type: 'uuid' })
  vaccineId: string

  @ManyToOne(() => Vaccine, { eager: false })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null

  @Column({ name: 'recorded_by_professional_id', type: 'uuid' })
  recordedByProfessionalId: string

  @ManyToOne(() => Professional, { eager: false })
  @JoinColumn({ name: 'recorded_by_professional_id' })
  recordedByProfessional: Professional

  /** Texto livre: "1ª dose", "reforço", "dose única". A Fase 2 dá vocabulário. */
  @Column({ name: 'dose_label', type: 'varchar', length: 40 })
  doseLabel: string

  /** `date`, não `timestamptz`: a caderneta registra o dia, não o instante. */
  @Column({ name: 'applied_at', type: 'date' })
  appliedAt: string

  @Column({ name: 'applied_at_our_clinic', default: false })
  appliedAtOurClinic: boolean

  /** Onde foi aplicada quando não foi aqui — "UBS Centro", "clínica X". */
  @Column({ name: 'applied_at_description', type: 'varchar', length: 160, nullable: true })
  appliedAtDescription: string | null

  /**
   * Lote e fabricante são transcritos da caderneta que o paciente traz, como
   * texto livre. A clínica não aplica vacina, então não há rastreabilidade de
   * lote a manter nem estoque a controlar.
   */
  @Column({ name: 'lot_number', type: 'varchar', length: 80, nullable: true })
  lotNumber: string | null

  @Column({ type: 'varchar', length: 80, nullable: true })
  manufacturer: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
