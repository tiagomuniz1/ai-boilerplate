jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/patients.service')
jest.mock('@/components/features/users/services/users.service')

import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { userService } from '@/components/features/users/services/users.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientForm } from './patient-form'
import type { IPatientModel } from '../types/patient-model.types'

const mockPush = jest.fn()

const mockUsers = [
  { id: 'user-1', fullName: 'Ana Costa', email: 'ana@example.com', role: 'user', isActive: true, createdAt: new Date() },
]

const existingPatient: IPatientModel = {
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '11999999999',
  birthDate: new Date('1990-05-15'),
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('PatientForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: mockUsers, total: 1, page: 1, limit: 100 })
  })

  it('renders user mode toggle and defaults to new user mode', () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('patient-form-user-mode')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-user-mode-new')).toBeChecked()
    expect(screen.getByTestId('patient-form-user-mode-existing')).not.toBeChecked()
    expect(screen.getByTestId('patient-form-fullname')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-email')).toBeInTheDocument()
  })

  it('shows user search and hides fullName/email when switching to existing mode', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))

    expect(screen.getByTestId('patient-form-user-search')).toBeInTheDocument()
    expect(screen.queryByTestId('patient-form-fullname')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-form-email')).not.toBeInTheDocument()
  })

  it('always shows patient-specific fields regardless of mode', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('patient-form-phone')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-birthdate')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-document')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-gender')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))

    expect(screen.getByTestId('patient-form-phone')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-birthdate')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-document')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-gender')).toBeInTheDocument()
  })

  it('calls onSubmit with fullName and email in new user mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('patient-form-fullname'), 'Maria Oliveira')
    await userEvent.type(screen.getByTestId('patient-form-email'), 'maria@example.com')
    await userEvent.type(screen.getByTestId('patient-form-phone'), '(11) 98765-4321')
    await userEvent.type(screen.getByTestId('patient-form-document'), '98765432100')
    await userEvent.selectOptions(screen.getByTestId('patient-form-gender'), PatientGender.FEMALE)
    await userEvent.type(screen.getByTestId('patient-form-birthdate'), '1992-08-20')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Maria Oliveira',
          email: 'maria@example.com',
          phoneNumber: '(11) 98765-4321',
          documentNumber: '98765432100',
          gender: PatientGender.FEMALE,
        }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with userId in existing user mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-user-search')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByTestId('patient-form-user-search'), 'Ana')

    await waitFor(
      () => expect(screen.getByTestId('patient-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )

    await userEvent.click(screen.getByTestId('patient-form-user-option'))
    await userEvent.type(screen.getByTestId('patient-form-phone'), '(11) 98765-4321')
    await userEvent.type(screen.getByTestId('patient-form-document'), '98765432100')
    await userEvent.selectOptions(screen.getByTestId('patient-form-gender'), PatientGender.FEMALE)
    await userEvent.type(screen.getByTestId('patient-form-birthdate'), '1992-08-20')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          phoneNumber: '(11) 98765-4321',
          documentNumber: '98765432100',
          gender: PatientGender.FEMALE,
        }),
        expect.any(Function),
      )
    })
    const call = onSubmit.mock.calls[0][0]
    expect(call.fullName).toBeUndefined()
    expect(call.email).toBeUndefined()
  })

  it('shows validation error when no user selected in existing mode', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione um usuário')).toBeInTheDocument()
    })
  })

  it('shows validation errors for empty required fields in new user mode', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-new'))
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email in new user mode', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-new'))
    await userEvent.type(screen.getByTestId('patient-form-email'), 'invalid-email')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid phone', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('patient-form-phone'), '123')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Telefone inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid document number', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('patient-form-document'), '123')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Documento deve ter 11 dígitos numéricos')).toBeInTheDocument()
    })
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <PatientForm
        mode="create"
        isPending={false}
        globalError="Não foi possível criar o paciente."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('patient-form-error')).toHaveTextContent(
      'Não foi possível criar o paciente.',
    )
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<PatientForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('patient-form-submit')).toBeDisabled()
  })

  it('shows "Nenhum usuário encontrado" when search returns no results', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })

    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))
    fireEvent.change(screen.getByTestId('patient-form-user-search'), { target: { value: 'xz' } })

    await waitFor(
      () => expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it('clears selected userId when user types in search after selecting', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))

    await waitFor(() => expect(screen.getByTestId('patient-form-user-search')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('patient-form-user-search'), 'Ana')

    await waitFor(
      () => expect(screen.getByTestId('patient-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )

    await userEvent.click(screen.getByTestId('patient-form-user-option'))

    // Type again after selecting — clears userId (line 283 TRUE branch)
    await userEvent.type(screen.getByTestId('patient-form-user-search'), ' Costa')

    // Should show validation error when submitting (userId was cleared)
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione um usuário')).toBeInTheDocument()
    })
  })

  it('onFocus with debouncedTerm >= 2 keeps dropdown open', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))

    // Type to set debouncedTerm >= 2 chars and open the dropdown
    fireEvent.change(screen.getByTestId('patient-form-user-search'), { target: { value: 'An' } })

    await waitFor(
      () => expect(screen.getByTestId('patient-form-user-search-results')).toBeInTheDocument(),
      { timeout: 2000 },
    )

    // Fire focus again with debouncedTerm = 'An' (>= 2) — covers the TRUE branch in onFocus
    fireEvent.focus(screen.getByTestId('patient-form-user-search'))

    expect(screen.getByTestId('patient-form-user-search-results')).toBeInTheDocument()
  })

  it('shows "Buscando..." in dropdown while user search is fetching', async () => {
    ;(userService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-user-mode-existing'))
    fireEvent.change(screen.getByTestId('patient-form-user-search'), { target: { value: 'An' } })

    await waitFor(
      () => {
        expect(screen.getByTestId('patient-form-user-search-results')).toBeInTheDocument()
        expect(screen.getByText('Buscando...')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })
})

describe('PatientForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('pre-fills form with existing patient data', async () => {
    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-fullname')).toHaveValue('João Silva')
    })

    expect(screen.getByTestId('patient-form-email')).toHaveValue('joao@example.com')
    expect(screen.getByTestId('patient-form-phone')).toHaveValue('(11) 99999-9999')
    expect(screen.getByTestId('patient-form-document')).toHaveValue('123.456.789-01')
    expect(screen.getByTestId('patient-form-gender')).toHaveValue(PatientGender.MALE)
  })

  it('calls onSubmit with updated values', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-fullname')).toHaveValue('João Silva')
    })

    await userEvent.clear(screen.getByTestId('patient-form-fullname'))
    await userEvent.type(screen.getByTestId('patient-form-fullname'), 'João Atualizado')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'João Atualizado' }),
        expect.any(Function),
      )
    })
  })

  it('shows global error in edit mode when provided', () => {
    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={false}
        globalError="Não foi possível salvar o paciente."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('patient-form-error')).toHaveTextContent(
      'Não foi possível salvar o paciente.',
    )
  })

  it('disables submit button when isPending in edit mode', () => {
    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={true}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('patient-form-submit')).toBeDisabled()
  })

  it('does not submit when fullName is too short in edit mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-fullname')).toHaveValue('João Silva')
    })

    await userEvent.clear(screen.getByTestId('patient-form-fullname'))
    await userEvent.type(screen.getByTestId('patient-form-fullname'), 'ab')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await act(async () => {})

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email in edit mode', async () => {
    renderWithProviders(
      <PatientForm mode="edit" defaultValues={existingPatient} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-email')).toHaveValue('joao@example.com')
    })

    await userEvent.clear(screen.getByTestId('patient-form-email'))
    await userEvent.type(screen.getByTestId('patient-form-email'), 'invalid-email')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid phone in edit mode', async () => {
    renderWithProviders(
      <PatientForm mode="edit" defaultValues={existingPatient} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-phone')).toHaveValue('(11) 99999-9999')
    })

    fireEvent.change(screen.getByTestId('patient-form-phone'), { target: { value: '12' } })
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Telefone inválido/)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid document number in edit mode', async () => {
    renderWithProviders(
      <PatientForm mode="edit" defaultValues={existingPatient} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-document')).toHaveValue('123.456.789-01')
    })

    fireEvent.change(screen.getByTestId('patient-form-document'), { target: { value: '123' } })
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/Documento deve ter 11/)).toBeInTheDocument()
    })
  })

  it('converts empty optional fields to undefined before calling onSubmit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <PatientForm
        mode="edit"
        defaultValues={existingPatient}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-form-fullname')).toHaveValue('João Silva')
    })

    await userEvent.clear(screen.getByTestId('patient-form-fullname'))
    await userEvent.clear(screen.getByTestId('patient-form-email'))
    fireEvent.change(screen.getByTestId('patient-form-phone'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('patient-form-birthdate'), { target: { value: '' } })

    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: undefined,
          email: undefined,
          phoneNumber: undefined,
          birthDate: undefined,
        }),
        expect.any(Function),
      )
    })
  })
})
