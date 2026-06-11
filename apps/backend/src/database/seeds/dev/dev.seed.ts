import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { Theme } from '../../../modules/themes/entities/theme.entity'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { User } from '../../../modules/users/entities/user.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

const SEED_THEMES = [
  {
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    isDefault: true,
  },
  {
    name: 'Verde Saúde',
    slug: 'verde-saude',
    accentColor: '#16A34A',
    accentSoftColor: '#DCFCE7',
    isDefault: false,
  },
  {
    name: 'Teal Moderno',
    slug: 'teal-moderno',
    accentColor: '#0D9488',
    accentSoftColor: '#CCFBF1',
    isDefault: false,
  },
  {
    name: 'Roxo Bem-Estar',
    slug: 'roxo-bem-estar',
    accentColor: '#7C3AED',
    accentSoftColor: '#EDE9FE',
    isDefault: false,
  },
  {
    name: 'Rosé Cuidado',
    slug: 'rose-cuidado',
    accentColor: '#E11D48',
    accentSoftColor: '#FFE4E6',
    isDefault: false,
  },
]

export async function devSeed(dataSource: DataSource): Promise<void> {
  const defaultTheme = await seedThemes(dataSource)
  await seedClinic(dataSource, defaultTheme.id)
  await seedPlatformAdmin(dataSource.getRepository(User))
  await seedClinicAdmin(dataSource.getRepository(User))
}

async function seedThemes(dataSource: DataSource): Promise<Theme> {
  const repository = dataSource.getRepository(Theme)

  for (const data of SEED_THEMES) {
    const existing = await repository.findOneBy({ slug: data.slug })
    if (!existing) {
      await repository.save(repository.create(data))
      console.log(`Dev seed: theme "${data.name}" created.`)
    }
  }

  const defaultTheme = await repository.findOneByOrFail({ slug: 'azul-clinico' })
  return defaultTheme
}

async function seedClinic(dataSource: DataSource, defaultThemeId: string): Promise<void> {
  const repository = dataSource.getRepository(Clinic)
  const existing = await repository.findOneBy({ id: SEED_CLINIC_ID })

  if (!existing) {
    await repository
      .createQueryBuilder()
      .insert()
      .into(Clinic)
      .values({
        id: SEED_CLINIC_ID,
        name: 'Clínica Demo',
        slug: 'clinica-demo',
        isActive: true,
        themeId: defaultThemeId,
      })
      .execute()
    console.log('Dev seed: demo clinic created.')
    return
  }

  if (!existing.themeId) {
    await repository.update(SEED_CLINIC_ID, { themeId: defaultThemeId })
    console.log('Dev seed: demo clinic theme assigned.')
  } else {
    console.log('Dev seed: demo clinic already exists, skipping.')
  }
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
