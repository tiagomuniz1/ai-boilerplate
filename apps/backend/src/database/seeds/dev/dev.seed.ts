import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { ThemeBorderRadius, UserRole } from '@app/shared'
import { Theme } from '../../../modules/themes/entities/theme.entity'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { User } from '../../../modules/users/entities/user.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

const SEED_THEMES = [
  {
    name: 'Teal Moderno',
    slug: 'teal-moderno',
    accentColor: '#0D9488',
    accentSoftColor: '#CCFBF1',
    isDefault: false,
    borderRadius: ThemeBorderRadius.SHARP,
  },
  {
    name: 'Rosé Cuidado',
    slug: 'rose-cuidado',
    accentColor: '#E11D48',
    accentSoftColor: '#FFE4E6',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
  },
  {
    name: 'Salvia Natural',
    slug: 'salvia-natural',
    accentColor: '#6D7A71',
    accentSoftColor: '#CDD9C5',
    isDefault: true,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#EFEADD',
    bgDarkColor: '#111A13',
  },
  {
    name: 'Pétala',
    slug: 'petala',
    accentColor: '#C8717C',
    accentSoftColor: '#F7E2E5',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FDF4F5',
    bgDarkColor: '#1C1014',
  },
  {
    name: 'Carmim',
    slug: 'carmim',
    accentColor: '#C44F6A',
    accentSoftColor: '#FAE0E6',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: '#FDF8F9',
    bgDarkColor: '#1A0D12',
  },
  {
    name: 'Âmbar',
    slug: 'ambar',
    accentColor: '#A8836A',
    accentSoftColor: '#F3E8DF',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: '#FAF5F0',
    bgDarkColor: '#1C1410',
  },
  {
    name: 'Mel',
    slug: 'mel',
    accentColor: '#9A7B4A',
    accentSoftColor: '#F3E8D5',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FDFAF4',
    bgDarkColor: '#191410',
  },
  {
    name: 'Pulso',
    slug: 'pulso',
    accentColor: '#5B1027',
    accentSoftColor: '#F5D8DF',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FAF7F4',
    bgDarkColor: '#0B1120',
  },
  {
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  },
  {
    name: 'Roxo Bem-Estar',
    slug: 'roxo-bem-estar',
    accentColor: '#7C3AED',
    accentSoftColor: '#EDE9FE',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  },
  {
    name: 'Verde Saúde',
    slug: 'verde-saude',
    accentColor: '#16A34A',
    accentSoftColor: '#DCFCE7',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
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

  const defaultTheme = await repository.findOneByOrFail({ isDefault: true })
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
        name: 'Pulso',
        slug: 'pulso',
        isActive: true,
        themeId: defaultThemeId,
      })
      .execute()
    console.log('Dev seed: Pulso clinic created.')
    return
  }

  const needsUpdate: Record<string, unknown> = {}
  if (!existing.themeId) needsUpdate.themeId = defaultThemeId
  if (existing.name !== 'Pulso') needsUpdate.name = 'Pulso'
  if (existing.slug !== 'pulso') needsUpdate.slug = 'pulso'

  if (Object.keys(needsUpdate).length > 0) {
    await repository.update(SEED_CLINIC_ID, needsUpdate)
    console.log('Dev seed: Pulso clinic updated.')
  } else {
    console.log('Dev seed: Pulso clinic already exists, skipping.')
  }
}

async function seedPlatformAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'platform@pulso.center' })
  if (existing) {
    if (existing.role !== UserRole.PLATFORM_ADMIN) {
      await repository.update(existing.id, { role: UserRole.PLATFORM_ADMIN, clinicId: null })
      console.log('Dev seed: updated platform admin role.')
    } else {
      console.log('Dev seed: platform admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Platform Admin',
      email: 'platform@pulso.center',
      password,
      role: UserRole.PLATFORM_ADMIN,
      clinicId: null,
    }),
  )

  console.log('Dev seed: platform admin created.')
}

async function seedClinicAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'admin@pulso.center' })
  if (existing) {
    const updates: Record<string, unknown> = {}
    if (existing.role !== UserRole.ADMIN) updates.role = UserRole.ADMIN
    if (!existing.clinicId) updates.clinicId = SEED_CLINIC_ID

    if (Object.keys(updates).length > 0) {
      await repository.update(existing.id, updates)
      console.log('Dev seed: updated clinic admin.')
    } else {
      console.log('Dev seed: clinic admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Administrator',
      email: 'admin@pulso.center',
      password,
      role: UserRole.ADMIN,
      clinicId: SEED_CLINIC_ID,
    }),
  )

  console.log('Dev seed: clinic admin created.')
}
