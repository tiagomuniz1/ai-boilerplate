import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('password_set_tokens')
export class PasswordSetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'clinic_id', type: 'varchar', nullable: true })
  clinicId: string | null

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
