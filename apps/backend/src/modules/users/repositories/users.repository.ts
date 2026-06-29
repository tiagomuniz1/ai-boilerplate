import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, QueryRunner, Repository } from 'typeorm'
import { UpdateUserDto } from '@app/shared'
import { User } from '../entities/user.entity'
import { CreateUserData, IUsersRepository } from './users.repository.interface'

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[User[], number]> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.clinic_id = :clinicId', { clinicId })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.created_at', 'DESC')

    if (search) {
      query.andWhere('user.full_name ILIKE :search', { search: `%${search}%` })
    }

    return query.getManyAndCount()
  }

  async findById(id: string, clinicId: string | null): Promise<User | null> {
    if (!clinicId) return this.repository.findOneBy({ id })
    return this.repository.findOneBy({ id, clinicId })
  }

  async findByEmail(email: string, clinicId?: string | null): Promise<User | null> {
    if (clinicId === undefined) {
      return this.repository.findOneBy({ email })
    }
    if (clinicId === null) {
      return this.repository.findOne({ where: { email, clinicId: IsNull() } })
    }
    return this.repository.findOneBy({ email, clinicId })
  }

  async create(data: CreateUserData, clinicId: string | null, queryRunner?: QueryRunner): Promise<User> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    return repo.save(repo.create({ ...data, clinicId }))
  }

  async update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    const user = await repo.findOneByOrFail({ id })
    Object.assign(user, data)
    return repo.save(user)
  }

  async updatePassword(id: string, hashedPassword: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    await repo.update(id, { password: hashedPassword })
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository
    await repo.softDelete(id)
  }
}
