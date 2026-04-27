import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { IUsersRepository } from './users.repository.interface'

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email })
  }
}
