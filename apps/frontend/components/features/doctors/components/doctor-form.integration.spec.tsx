jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')
jest.mock('@/components/features/users/services/users.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { userService } from '@/components/features/users/services/users.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorForm } from './doctor-form'
import type { IDoctorModel } from '../types/doctor-model.types'

const mockPush = jest.fn()

const mockUsers = [
  { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', role: 'user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
]

const existingDoctor: IDoctorModel = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: 'Bio inicial.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('DoctorForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: mockUsers, total: 1, page: 1, limit: 100 })
  })

  it('renders all create fields', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('doctor-form-user')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-crm')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-specialty')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-bio')).toBeInTheDocument()
  })

  it('calls onSubmit with form values on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-user')).not.toBeDisabled()
    })

    await userEvent.selectOptions(screen.getByTestId('doctor-form-user'), 'user-uuid-1')
    await userEvent.type(screen.getByTestId('doctor-form-crm'), '12345/SP')
    await userEvent.type(screen.getByTestId('doctor-form-specialty'), 'Cardiologia')

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          crmNumber: '12345/SP',
          specialty: 'Cardiologia',
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

  it('shows validation error for short specialty', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('doctor-form-specialty'), 'ab')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Especialidade deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for bio exceeding max length and applies error style to textarea', async () => {
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

    expect(screen.getByTestId('doctor-form-specialty')).toHaveValue('Cardiologia')
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

  it('calls onSubmit with updated values', async () => {
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

    await userEvent.clear(screen.getByTestId('doctor-form-specialty'))
    await userEvent.type(screen.getByTestId('doctor-form-specialty'), 'Neurologia')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ specialty: 'Neurologia' }),
        expect.any(Function),
      )
    })
  })

  it('submits with undefined for empty optional fields and handles null bio default', async () => {
    const onSubmit = jest.fn()
    const doctorWithNullBio: IDoctorModel = { ...existingDoctor, bio: null }

    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={doctorWithNullBio}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm')).toHaveValue('12345/SP')
    })

    await userEvent.clear(screen.getByTestId('doctor-form-crm'))
    await userEvent.clear(screen.getByTestId('doctor-form-specialty'))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ crmNumber: undefined, specialty: undefined, bio: undefined }),
        expect.any(Function),
      )
    })
  })

  it('shows validation errors for invalid fields in edit mode', async () => {
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
    await userEvent.clear(screen.getByTestId('doctor-form-specialty'))
    await userEvent.type(screen.getByTestId('doctor-form-specialty'), 'ab')
    const longBio = 'a'.repeat(501)
    await userEvent.type(screen.getByTestId('doctor-form-bio'), longBio)
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/CRM inválido/)).toBeInTheDocument()
    })
    expect(screen.getByText('Especialidade deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Bio deve ter no máximo 500 caracteres')).toBeInTheDocument()
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
})
