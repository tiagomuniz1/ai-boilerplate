import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string

  @Column({ name: 'expires_at' })
  expiresAt: Date

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamp' })
  revokedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
