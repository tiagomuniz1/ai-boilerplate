jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/clinics.service')
jest.mock('@/components/features/themes/hooks/use-themes.hook')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { SubscriptionPlan } from '@app/shared'
import { useThemes } from '@/components/features/themes/hooks/use-themes.hook'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicForm } from './clinic-form'
import type { IClinicModel } from '../types/clinic.types'
import type { IThemeModel } from '@/components/features/themes/types/theme-model.types'

const mockPush = jest.fn()
const mockUseThemes = useThemes as jest.MockedFunction<typeof useThemes>

const THEME_ID_1 = '11111111-1111-4111-8111-111111111111'
const THEME_ID_2 = '22222222-2222-4222-8222-222222222222'

const sampleThemes: IThemeModel[] = [
  {
    id: THEME_ID_1,
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    isDefault: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: THEME_ID_2,
    name: 'Verde Saúde',
    slug: 'verde-saude',
    accentColor: '#16A34A',
    accentSoftColor: '#DCFCE7',
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const defaultThemesReturn = {
  data: { data: sampleThemes, total: 2, page: 1, limit: 50 },
  isPending: false,
  isError: false,
} as ReturnType<typeof useThemes>

const existingClinic: IClinicModel = {
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  plan: SubscriptionPlan.CLINICA,
  themeId: null,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    country: 'BR',
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

async function fillAddressFields() {
  await userEvent.type(screen.getByTestId('clinic-form-address-street'), 'Rua das Flores')
  await userEvent.type(screen.getByTestId('clinic-form-address-number'), '123')
  await userEvent.type(screen.getByTestId('clinic-form-address-neighborhood'), 'Centro')
  await userEvent.type(screen.getByTestId('clinic-form-address-city'), 'São Paulo')
  await userEvent.type(screen.getByTestId('clinic-form-address-state'), 'SP')
  await userEvent.type(screen.getByTestId('clinic-form-address-zipcode'), '01310-100')
}

describe('ClinicForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    mockUseThemes.mockReturnValue(defaultThemesReturn)
  })

  it('renders name and slug fields', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('clinic-form-name')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-slug')).toBeInTheDocument()
  })

  it('renders address fields', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('clinic-form-address-street')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-number')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-neighborhood')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-city')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-state')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-zipcode')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-address-complement')).toBeInTheDocument()
  })

  it('does not render isActive checkbox in create mode', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.queryByTestId('clinic-form-isactive')).not.toBeInTheDocument()
  })

  it('shows slug preview as empty string initially', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.queryByTestId('clinic-form-slug-preview')).not.toBeInTheDocument()
  })

  it('updates slug preview in real time from name field', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Minha Clínica')

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-slug-preview')).toHaveTextContent('minha-clnica')
    })
  })

  it('shows manually entered slug in preview when slug field is filled', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Minha Clínica')
    await userEvent.type(screen.getByTestId('clinic-form-slug'), 'slug-manual')

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-slug-preview')).toHaveTextContent('slug-manual')
    })
  })

  it('calls onSubmit with form values including address on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Clínica Nova',
          address: expect.objectContaining({ street: 'Rua das Flores', zipCode: '01310-100' }),
        }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with slug when slug field is filled', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await userEvent.type(screen.getByTestId('clinic-form-slug'), 'clinica-nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Clínica Nova', slug: 'clinica-nova' }),
        expect.any(Function),
      )
    })
  })

  it('renders the plan select with all plan options and defaults to Grátis', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const select = screen.getByTestId('clinic-form-plan') as HTMLSelectElement
    expect(select.value).toBe(SubscriptionPlan.FREE)
    expect(screen.getByRole('option', { name: 'Grátis' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Solo' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Clínica' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Grupo' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Rede' })).toBeInTheDocument()
  })

  it('submits the default Free plan when not changed', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ plan: SubscriptionPlan.FREE }),
        expect.any(Function),
      )
    })
  })

  it('submits the selected plan', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await userEvent.selectOptions(screen.getByTestId('clinic-form-plan'), SubscriptionPlan.GRUPO)
    await fillAddressFields()
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ plan: SubscriptionPlan.GRUPO }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error when name is empty', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter ao menos 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid slug format', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await userEvent.type(screen.getByTestId('clinic-form-slug'), 'INVALID SLUG!')
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Slug inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid zipCode format', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await userEvent.type(screen.getByTestId('clinic-form-address-zipcode'), '12345')
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/CEP inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error when complement exceeds max length', async () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(
      screen.getByTestId('clinic-form-address-complement'),
      'A'.repeat(101),
    )
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter ao menos 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <ClinicForm
        mode="create"
        isPending={false}
        globalError="Slug já em uso."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('clinic-form-error')).toHaveTextContent('Slug já em uso.')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('clinic-form-submit')).toBeDisabled()
  })

  it('renders theme selector with available themes', () => {
    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('clinic-form-theme-selector')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-theme-none')).toBeInTheDocument()
    expect(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_2}`)).toBeInTheDocument()
  })

  it('shows loading skeleton while themes are fetching', () => {
    mockUseThemes.mockReturnValue({ ...defaultThemesReturn, isPending: true, data: undefined } as ReturnType<typeof useThemes>)

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('clinic-form-theme-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('clinic-form-theme-selector')).not.toBeInTheDocument()
  })

  it('selects a theme and includes themeId in submit payload', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_1}`))
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: THEME_ID_1 }),
        expect.any(Function),
      )
    })
  })

  it('submits with themeId null when no theme is selected', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: null }),
        expect.any(Function),
      )
    })
  })

  it('clears theme selection when "Padrão da plataforma" is clicked after selecting a theme', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ClinicForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('clinic-form-name'), 'Clínica Nova')
    await fillAddressFields()
    await userEvent.click(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_1}`))
    await userEvent.click(screen.getByTestId('clinic-form-theme-none'))
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: null }),
        expect.any(Function),
      )
    })
  })
})

const clinicWithoutAddress: IClinicModel = {
  id: 'uuid-2',
  name: 'Clínica Sem Endereço',
  slug: 'clinica-sem-endereco',
  isActive: true,
  themeId: null,
  address: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('ClinicForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    mockUseThemes.mockReturnValue(defaultThemesReturn)
  })

  it('pre-fills form with existing clinic data', async () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-name')).toHaveValue('Clínica do Coração')
      expect(screen.getByTestId('clinic-form-slug')).toHaveValue('clinica-do-coracao')
    })
  })

  it('pre-fills address fields with existing clinic address', async () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-address-street')).toHaveValue('Rua das Flores')
      expect(screen.getByTestId('clinic-form-address-number')).toHaveValue('123')
      expect(screen.getByTestId('clinic-form-address-zipcode')).toHaveValue('01310-100')
    })
  })

  it('shows isActive checkbox in edit mode', () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('clinic-form-isactive')).toBeInTheDocument()
  })

  it('shows isActive checkbox checked when clinic is active', () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('clinic-form-isactive')).toBeChecked()
  })

  it('shows isActive checkbox unchecked when clinic is inactive', () => {
    renderWithProviders(
      <ClinicForm
        mode="edit"
        defaultValues={{ ...existingClinic, isActive: false }}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('clinic-form-isactive')).not.toBeChecked()
  })

  it('calls onSubmit with updated values', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-name')).toHaveValue('Clínica do Coração')
    })

    await userEvent.click(screen.getByTestId('clinic-form-isactive'))
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        expect.any(Function),
      )
    })
  })

  it('does not render slug preview in edit mode', () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.queryByTestId('clinic-form-slug-preview')).not.toBeInTheDocument()
  })

  it('pre-fills the plan from defaultValues and submits it (including a change)', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-plan')).toHaveValue(SubscriptionPlan.CLINICA)
    })

    await userEvent.selectOptions(screen.getByTestId('clinic-form-plan'), SubscriptionPlan.SOLO)
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ plan: SubscriptionPlan.SOLO }),
        expect.any(Function),
      )
    })
  })

  it('shows global error in edit mode when provided', () => {
    renderWithProviders(
      <ClinicForm
        mode="edit"
        defaultValues={existingClinic}
        isPending={false}
        globalError="Slug já em uso."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('clinic-form-error')).toHaveTextContent('Slug já em uso.')
  })

  it('disables submit button when isPending in edit mode', () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('clinic-form-submit')).toBeDisabled()
  })

  it('shows validation error when name is too short in edit mode', async () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-name')).toHaveValue('Clínica do Coração')
    })

    await userEvent.clear(screen.getByTestId('clinic-form-name'))
    await userEvent.type(screen.getByTestId('clinic-form-name'), 'AB')
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter ao menos 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error when slug is invalid in edit mode', async () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-slug')).toHaveValue('clinica-do-coracao')
    })

    await userEvent.clear(screen.getByTestId('clinic-form-slug'))
    await userEvent.type(screen.getByTestId('clinic-form-slug'), 'SLUG INVÁLIDO!')
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Slug inválido/)).toBeInTheDocument()
    })
  })

  it('initializes form without address values when clinic has no address', async () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={clinicWithoutAddress} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-address-street')).toHaveValue('')
    })
  })

  it('calls onSubmit with undefined for name and slug when fields are cleared', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-name')).toHaveValue('Clínica do Coração')
    })

    await userEvent.clear(screen.getByTestId('clinic-form-name'))
    await userEvent.clear(screen.getByTestId('clinic-form-slug'))
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: undefined, slug: undefined }),
        expect.any(Function),
      )
    })
  })

  it('renders theme selector in edit mode', () => {
    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('clinic-form-theme-selector')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-form-theme-none')).toBeInTheDocument()
  })

  it('pre-selects theme option when clinic has a themeId', () => {
    renderWithProviders(
      <ClinicForm
        mode="edit"
        defaultValues={{ ...existingClinic, themeId: THEME_ID_1 }}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_2}`)).toBeInTheDocument()
  })

  it('includes themeId in submit payload in edit mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ClinicForm mode="edit" defaultValues={existingClinic} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('clinic-form-name')).toHaveValue('Clínica do Coração')
    })

    await userEvent.click(screen.getByTestId(`clinic-form-theme-option-${THEME_ID_2}`))
    await userEvent.click(screen.getByTestId('clinic-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: THEME_ID_2 }),
        expect.any(Function),
      )
    })
  })
})
