import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('access_requests')
export class AccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'full_name' })
  fullName: string

  @Column()
  email: string

  @Column({ name: 'clinic_name' })
  clinicName: string

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null
}
