import { QueryRunner } from 'typeorm'
import { CreateUserDto, UpdateUserDto } from '@app/shared'
import { User } from '../entities/user.entity'

export abstract class IUsersRepository {
  abstract findAll(page: number, limit: number): Promise<[User[], number]>
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
