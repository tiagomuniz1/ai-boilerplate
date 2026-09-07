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
import { VaccineDecision as VaccineDecisionEnum } from '@app/shared'
import { Professional } from '../../professionals/entities/professional.entity'
import { Vaccine } from '../../vaccines/entities/vaccine.entity'

/**
 * O que o profissional decidiu sobre uma pendência apontada pelo calendário.
 *
 * Esta tabela é o que torna o sistema um informante e não um prescritor: ele
 * aponta "pendente pelo calendário", e a palavra final fica registrada aqui,
 * com quem decidiu e por quê. Sem ela, contraindicação e esquema especial
 * virariam alerta permanente e errado na tela.
 *
 * Uma decisão por (paciente, vacina) — a mais recente vale, e o histórico fica
 * no soft delete.
 */
@Entity('vaccine_decisions')
@Index('IDX_vaccine_decisions_patient_vaccine', ['patientId', 'vaccineId'])
export class VaccineDecisionRecord {
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

  @Column({ type: 'varchar', length: 20 })
  decision: VaccineDecisionEnum

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null

  @Column({ name: 'decided_by_professional_id', type: 'uuid' })
  decidedByProfessionalId: string

  @ManyToOne(() => Professional, { eager: false })
  @JoinColumn({ name: 'decided_by_professional_id' })
  decidedByProfessional: Professional

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
