jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/clinics.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicForm } from './clinic-form'
import type { IClinicModel } from '../types/clinic.types'

const mockPush = jest.fn()

const existingClinic: IClinicModel = {
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
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
})

const clinicWithoutAddress: IClinicModel = {
  id: 'uuid-2',
  name: 'Clínica Sem Endereço',
  slug: 'clinica-sem-endereco',
  isActive: true,
  address: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('ClinicForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
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
})
