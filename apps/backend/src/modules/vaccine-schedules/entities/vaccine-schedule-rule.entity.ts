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
import { PatientGender } from '@app/shared'
import { Vaccine } from '../../vaccines/entities/vaccine.entity'

/**
 * Uma dose do calendário: para tal vacina, a partir de que idade, até quando, e
 * com que intervalo da anterior.
 *
 * Global e sem `clinicId`, como o catálogo — mas, ao contrário dele, esta tabela
 * é a fonte de uma afirmação clínica ("falta a 2ª dose"). Por isso é editável no
 * backoffice: quando o Ministério muda o calendário, a correção é curadoria, não
 * deploy.
 */
@Entity('vaccine_schedule_rules')
@Index('IDX_vaccine_schedule_rules_vaccine', ['vaccineId'])
export class VaccineScheduleRule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'vaccine_id', type: 'uuid' })
  vaccineId: string

  @ManyToOne(() => Vaccine, { eager: false })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine

  @Column({ name: 'dose_label', type: 'varchar', length: 40 })
  doseLabel: string

  /** Ordena as doses da mesma vacina; é por ele que o motor sabe qual é a próxima. */
  @Column({ name: 'dose_order', type: 'int' })
  doseOrder: number

  /** Idade mínima em meses. 0 = ao nascer. */
  @Column({ name: 'min_age_months', type: 'int' })
  minAgeMonths: number

  /** Nulo = sem teto. Passar do teto é "atrasada", não "pendente". */
  @Column({ name: 'max_age_months', type: 'int', nullable: true })
  maxAgeMonths: number | null

  /** Nulo na primeira dose. */
  @Column({ name: 'min_interval_days', type: 'int', nullable: true })
  minIntervalDays: number | null

  /** Nulo = vale para todos. HPV e outras têm recorte. */
  @Column({ name: 'applies_to_gender', type: 'varchar', length: 10, nullable: true })
  appliesToGender: PatientGender | null

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
