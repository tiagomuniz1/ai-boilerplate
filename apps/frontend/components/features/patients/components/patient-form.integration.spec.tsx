jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/patients.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientForm } from './patient-form'
import type { IPatientModel } from '../types/patient-model.types'

const mockPush = jest.fn()

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
  })

  it('renders all create fields', () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('patient-form-fullname')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-email')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-phone')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-birthdate')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-document')).toBeInTheDocument()
    expect(screen.getByTestId('patient-form-gender')).toBeInTheDocument()
  })

  it('calls onSubmit with form values on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('patient-form-fullname'), 'Maria Oliveira')
    await userEvent.type(screen.getByTestId('patient-form-email'), 'maria@example.com')
    await userEvent.type(screen.getByTestId('patient-form-phone'), '(11) 98765-4321')
    await userEvent.type(screen.getByTestId('patient-form-document'), '98765432100')
    await userEvent.selectOptions(screen.getByTestId('patient-form-gender'), PatientGender.FEMALE)

    const birthdateInput = screen.getByTestId('patient-form-birthdate')
    await userEvent.type(birthdateInput, '1992-08-20')

    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Maria Oliveira',
          email: 'maria@example.com',
          phoneNumber: '11987654321',
          documentNumber: '98765432100',
          gender: PatientGender.FEMALE,
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation errors for empty required fields', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderWithProviders(<PatientForm mode="create" isPending={false} onSubmit={jest.fn()} />)

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

  it('shows validation errors for invalid field values in edit mode', async () => {
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

    await userEvent.clear(screen.getByTestId('patient-form-fullname'))
    await userEvent.type(screen.getByTestId('patient-form-fullname'), 'ab')
    await userEvent.clear(screen.getByTestId('patient-form-email'))
    await userEvent.type(screen.getByTestId('patient-form-email'), 'not-an-email')
    await userEvent.clear(screen.getByTestId('patient-form-phone'))
    await userEvent.type(screen.getByTestId('patient-form-phone'), '123')
    await userEvent.clear(screen.getByTestId('patient-form-birthdate'))
    await userEvent.type(screen.getByTestId('patient-form-birthdate'), '2099-01-01')
    await userEvent.clear(screen.getByTestId('patient-form-document'))
    await userEvent.type(screen.getByTestId('patient-form-document'), '123')
    await userEvent.selectOptions(screen.getByTestId('patient-form-gender'), '')
    await userEvent.click(screen.getByTestId('patient-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('calls onSubmit with undefined for cleared optional fields', async () => {
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
    await userEvent.clear(screen.getByTestId('patient-form-phone'))
    await userEvent.clear(screen.getByTestId('patient-form-birthdate'))
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
