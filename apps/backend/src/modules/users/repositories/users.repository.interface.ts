import { QueryRunner } from 'typeorm'
import { UpdateUserDto, UserRole } from '@app/shared'
import { User } from '../entities/user.entity'

export interface CreateUserData {
  fullName: string
  email: string
  password: string
  role?: UserRole
  isActive?: boolean
}

export abstract class IUsersRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[User[], number]>
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract create(data: CreateUserData, queryRunner?: QueryRunner): Promise<User>
  abstract update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
