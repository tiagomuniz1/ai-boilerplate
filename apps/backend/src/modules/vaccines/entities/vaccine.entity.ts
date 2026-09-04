import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Catálogo global de imunobiológicos, sem `clinicId` — a mesma natureza de
 * `medications`: vocabulário da plataforma que toda clínica consome e só o
 * PLATFORM_ADMIN edita.
 *
 * Ao contrário de medicamentos, aqui não há importação: o calendário oficial
 * não é publicado em formato aberto como o CSV da ANVISA, e são algumas dezenas
 * de entradas. Por isso não existem `source` nem `importHash`, e a busca não
 * precisa de índice trigrama — um `ILIKE` sobre dezenas de linhas basta.
 */
@Entity('vaccines')
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index('IDX_vaccines_name')
  @Column({ length: 120 })
  name: string

  /** Sigla de uso corrente: dTpa, SCR, VIP, HPV. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  abbreviation: string | null

  /** Texto livre — "sarampo, caxumba, rubéola". Serve à busca e à leitura. */
  @Column({ name: 'prevented_diseases', type: 'varchar', length: 250, nullable: true })
  preventedDiseases: string | null

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
