import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { User } from '../../../modules/users/entities/user.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

export async function devSeed(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(User)

  await seedPlatformAdmin(repository)
  await seedClinicAdmin(repository)
}

async function seedPlatformAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'platform@umi.dev' })
  if (existing) {
    if (existing.role !== UserRole.PLATFORM_ADMIN) {
      await repository.update(existing.id, { role: UserRole.PLATFORM_ADMIN, clinicId: null })
      console.log('Dev seed: updated platform admin role.')
    } else {
      console.log('Dev seed: platform admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('Platform123!', 10)
  await repository.save(
    repository.create({
      fullName: 'Platform Admin',
      email: 'platform@umi.dev',
      password,
      role: UserRole.PLATFORM_ADMIN,
      clinicId: null,
    }),
  )

  console.log('Dev seed: platform admin created.')
}

async function seedClinicAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'tiagomuniz1@gmail.com' })
  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      await repository.update(existing.id, { role: UserRole.ADMIN })
      console.log('Dev seed: updated clinic admin role.')
    } else {
      console.log('Dev seed: clinic admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Tiago Muniz',
      email: 'tiagomuniz1@gmail.com',
      password,
      role: UserRole.ADMIN,
      clinicId: SEED_CLINIC_ID,
    }),
  )

  console.log('Dev seed: clinic admin created.')
}
