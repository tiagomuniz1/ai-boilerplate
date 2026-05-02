import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { User } from '../../../modules/users/entities/user.entity'

export async function devSeed(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(User)

  const existing = await repository.findOneBy({ email: 'tiagomuniz1@gmail.com' })
  if (existing) {
    console.log('Dev seed: user already exists, skipping.')
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Tiago Muniz',
      email: 'tiagomuniz1@gmail.com',
      password,
      role: UserRole.USER,
    }),
  )

  console.log('Dev seed: user created.')
}
