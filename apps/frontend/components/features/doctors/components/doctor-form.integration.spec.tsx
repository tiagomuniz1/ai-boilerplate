jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')
jest.mock('@/components/features/users/services/users.service')
jest.mock('@/components/features/specialties/services/specialties.service')
jest.mock('@/stores/auth.store')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { userService } from '@/components/features/users/services/users.service'
import { specialtiesService } from '@/components/features/specialties/services/specialties.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorForm } from './doctor-form'
import type { IDoctorModel } from '../types/doctor-model.types'

const mockPush = jest.fn()

const mockUsers = [
  { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', role: 'user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
]

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockSpecialties = [
  { id: SPEC_ID_1, name: 'Cardiologia', description: null, createdAt: new Date(), updatedAt: new Date() },
  { id: SPEC_ID_2, name: 'Neurologia', description: null, createdAt: new Date(), updatedAt: new Date() },
]

const mockAdminUser = { id: 'auth-user-id', fullName: 'Admin', email: 'admin@test.com', role: 'admin' as const }

const existingDoctor: IDoctorModel = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  crmNumber: '12345/SP',
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia' }],
  bio: 'Bio inicial.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('DoctorForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof mockAdminUser }) => unknown) =>
      selector({ user: mockAdminUser }),
    )
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: mockUsers, total: 1, page: 1, limit: 100 })
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({ data: mockSpecialties, total: 2, page: 1, limit: 100 })
  })

  it('renders all create fields', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('doctor-form-user')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-crm')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-specialty-group')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-bio')).toBeInTheDocument()
  })

  it('renders specialty checkboxes after loading', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`)).toBeInTheDocument()
    })
  })

  it('calls onSubmit with form values on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-user')).not.toBeDisabled()
    })

    await userEvent.selectOptions(screen.getByTestId('doctor-form-user'), 'user-uuid-1')
    await userEvent.type(screen.getByTestId('doctor-form-crm'), '12345/SP')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          crmNumber: '12345/SP',
          specialtyIds: [SPEC_ID_1],
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation errors for empty required fields', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione um usuário')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid CRM format', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('doctor-form-crm'), 'INVALID')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/CRM inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error when no specialty is selected', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-user')).not.toBeDisabled()
    })

    await userEvent.selectOptions(screen.getByTestId('doctor-form-user'), 'user-uuid-1')
    await userEvent.type(screen.getByTestId('doctor-form-crm'), '12345/SP')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione ao menos uma especialidade')).toBeInTheDocument()
    })
  })

  it('allows selecting multiple specialties', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-user')).not.toBeDisabled()
    })

    await userEvent.selectOptions(screen.getByTestId('doctor-form-user'), 'user-uuid-1')
    await userEvent.type(screen.getByTestId('doctor-form-crm'), '12345/SP')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`))

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialtyIds: expect.arrayContaining([SPEC_ID_1, SPEC_ID_2]),
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error for bio exceeding max length', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const longBio = 'a'.repeat(501)
    await userEvent.type(screen.getByTestId('doctor-form-bio'), longBio)
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Bio deve ter no máximo 500 caracteres')).toBeInTheDocument()
    })
    expect(screen.getByTestId('doctor-form-bio')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <DoctorForm
        mode="create"
        isPending={false}
        globalError="CRM já cadastrado."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('doctor-form-error')).toHaveTextContent('CRM já cadastrado.')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<DoctorForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('doctor-form-submit')).toBeDisabled()
  })
})

describe('DoctorForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof mockAdminUser }) => unknown) =>
      selector({ user: mockAdminUser }),
    )
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({ data: mockSpecialties, total: 2, page: 1, limit: 100 })
  })

  it('pre-fills form with existing doctor data', async () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm')).toHaveValue('12345/SP')
    })

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })
    expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`)).not.toBeChecked()
  })

  it('shows readonly user display in edit mode', () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('doctor-form-user-readonly')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-user-readonly')).toHaveTextContent('Dr. João Silva')
    expect(screen.queryByTestId('doctor-form-user')).not.toBeInTheDocument()
  })

  it('calls onSubmit with updated specialties', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm')).toHaveValue('12345/SP')
    })

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialtyIds: expect.arrayContaining([SPEC_ID_1, SPEC_ID_2]),
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error for invalid CRM in edit mode', async () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm')).toHaveValue('12345/SP')
    })

    await userEvent.clear(screen.getByTestId('doctor-form-crm'))
    await userEvent.type(screen.getByTestId('doctor-form-crm'), 'INVALID')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/CRM inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error for bio exceeding max length in edit mode', async () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm')).toHaveValue('12345/SP')
    })

    const longBio = 'a'.repeat(501)
    await userEvent.type(screen.getByTestId('doctor-form-bio'), longBio)
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Bio deve ter no máximo 500 caracteres')).toBeInTheDocument()
    })
  })

  it('shows global error in edit mode when provided', () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        globalError="CRM já em uso."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('doctor-form-error')).toHaveTextContent('CRM já em uso.')
  })

  it('disables submit button when isPending in edit mode', () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={true}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('doctor-form-submit')).toBeDisabled()
  })

  it('shows isActive checkbox checked when doctor is active (ADMIN)', () => {
    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('doctor-form-isactive')).toBeChecked()
  })

  it('shows isActive checkbox unchecked when doctor is inactive (ADMIN)', () => {
    const inactiveDoctor: IDoctorModel = {
      ...existingDoctor,
      user: { ...existingDoctor.user, isActive: false },
    }

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={inactiveDoctor} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('doctor-form-isactive')).not.toBeChecked()
  })

  it('does not show isActive checkbox for non-admin', () => {
    const nonAdminUser = { ...mockAdminUser, role: 'user' as const }
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof nonAdminUser }) => unknown) =>
      selector({ user: nonAdminUser }),
    )

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.queryByTestId('doctor-form-isactive')).not.toBeInTheDocument()
  })

  it('submits isActive=false when admin unchecks checkbox', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-isactive')).toBeChecked()
    })

    await userEvent.click(screen.getByTestId('doctor-form-isactive'))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        expect.any(Function),
      )
    })
  })
})
