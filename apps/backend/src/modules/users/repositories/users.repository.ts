import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CreateUserDto, UpdateUserDto } from '@app/shared'
import { User } from '../entities/user.entity'
import { IUsersRepository } from './users.repository.interface'

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(page: number, limit: number): Promise<[User[], number]> {
    return this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email })
  }

  async create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    const user = await repo.findOneByOrFail({ id })
    Object.assign(user, data)
    return repo.save(user)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    await repo.softDelete(id)
  }
}
