import { ThemeBorderRadius } from '@app/shared'

// Canonical platform theme catalogue (no clinicId). Single source of truth shared
// by the dev seed and the themes importer (run-import-themes) so both stay in sync.
export interface CanonicalTheme {
  name: string
  slug: string
  accentColor: string
  accentSoftColor: string
  isDefault: boolean
  borderRadius: ThemeBorderRadius
  bgColor?: string
  bgDarkColor?: string
}

export const CANONICAL_THEMES: CanonicalTheme[] = [
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
