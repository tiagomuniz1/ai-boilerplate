jest.mock('../services/clinics.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clinicsService } from '../services/clinics.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { RegisterClinicForm } from './register-clinic-form'

const makeResponse = () => ({
  clinic: { id: 'clinic-uuid-1', name: 'Clínica do Coração', slug: 'clinica-do-coracao' },
  admin: { id: 'admin-uuid-1', fullName: 'Admin Silva', email: 'admin@clinica.com' },
})

async function fillValidForm() {
  await userEvent.type(screen.getByTestId('register-clinic-name'), 'Clínica do Coração')
  await userEvent.type(screen.getByTestId('register-admin-fullname'), 'Admin Silva')
  await userEvent.type(screen.getByTestId('register-admin-email'), 'admin@clinica.com')
  await userEvent.type(screen.getByTestId('register-admin-password'), 'senha1234')
  await userEvent.type(screen.getByTestId('register-admin-password-confirm'), 'senha1234')
}

describe('RegisterClinicForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderWithProviders(<RegisterClinicForm />)

    expect(screen.getByTestId('register-clinic-name')).toBeInTheDocument()
    expect(screen.getByTestId('register-clinic-slug')).toBeInTheDocument()
    expect(screen.getByTestId('register-admin-fullname')).toBeInTheDocument()
    expect(screen.getByTestId('register-admin-email')).toBeInTheDocument()
    expect(screen.getByTestId('register-admin-password')).toBeInTheDocument()
    expect(screen.getByTestId('register-admin-password-confirm')).toBeInTheDocument()
  })

  it('renders two visual sections', () => {
    renderWithProviders(<RegisterClinicForm />)

    expect(screen.getByTestId('register-section-clinic')).toBeInTheDocument()
    expect(screen.getByTestId('register-section-admin')).toBeInTheDocument()
  })

  it('shows slug preview as empty initially', () => {
    renderWithProviders(<RegisterClinicForm />)

    expect(screen.queryByTestId('register-clinic-slug-preview')).not.toBeInTheDocument()
  })

  it('updates slug preview in real time from clinic name', async () => {
    renderWithProviders(<RegisterClinicForm />)

    await userEvent.type(screen.getByTestId('register-clinic-name'), 'Minha Clínica')

    await waitFor(() => {
      expect(screen.getByTestId('register-clinic-slug-preview')).toHaveTextContent('minha-clnica')
    })
  })

  it('shows manually entered slug in preview when slug field is filled', async () => {
    renderWithProviders(<RegisterClinicForm />)

    await userEvent.type(screen.getByTestId('register-clinic-name'), 'Minha Clínica')
    await userEvent.type(screen.getByTestId('register-clinic-slug'), 'slug-manual')

    await waitFor(() => {
      expect(screen.getByTestId('register-clinic-slug-preview')).toHaveTextContent('slug-manual')
    })
  })

  it('shows success state after valid submit', async () => {
    ;(clinicsService.register as jest.Mock).mockResolvedValue(makeResponse())

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('register-clinic-success')).toBeInTheDocument()
    })

    expect(screen.getByTestId('register-clinic-success-message')).toHaveTextContent(
      'Clínica criada com sucesso!',
    )
    expect(screen.queryByTestId('register-clinic-form')).not.toBeInTheDocument()
  })

  it('shows login link in success state', async () => {
    ;(clinicsService.register as jest.Mock).mockResolvedValue(makeResponse())

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('register-clinic-login-link')).toBeInTheDocument()
    })
  })

  it('disables submit button while pending', async () => {
    ;(clinicsService.register as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    expect(screen.getByTestId('register-clinic-submit')).toBeDisabled()
  })

  it('shows validation error when clinic name is too short', async () => {
    renderWithProviders(<RegisterClinicForm />)

    await userEvent.type(screen.getByTestId('register-clinic-name'), 'AB')
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('register-clinic-name')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('shows validation error for invalid email format', async () => {
    renderWithProviders(<RegisterClinicForm />)

    await userEvent.type(screen.getByTestId('register-clinic-name'), 'Clínica Nova')
    await userEvent.type(screen.getByTestId('register-admin-fullname'), 'Admin')
    await userEvent.type(screen.getByTestId('register-admin-email'), 'not-an-email')
    await userEvent.type(screen.getByTestId('register-admin-password'), 'senha1234')
    await userEvent.type(screen.getByTestId('register-admin-password-confirm'), 'senha1234')
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  it('shows validation error when passwords do not match', async () => {
    renderWithProviders(<RegisterClinicForm />)

    await userEvent.type(screen.getByTestId('register-clinic-name'), 'Clínica Nova')
    await userEvent.type(screen.getByTestId('register-admin-fullname'), 'Admin')
    await userEvent.type(screen.getByTestId('register-admin-email'), 'admin@clinica.com')
    await userEvent.type(screen.getByTestId('register-admin-password'), 'senha1234')
    await userEvent.type(screen.getByTestId('register-admin-password-confirm'), 'outrasenha')
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
    })
  })

  it('sets error on slug field when 409 with slug detail', async () => {
    ;(clinicsService.register as jest.Mock).mockRejectedValue({
      status: 409,
      title: 'Conflict',
      detail: 'Slug already in use',
    })

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByText('Este endereço já está em uso')).toBeInTheDocument()
    })
  })

  it('sets error on email field when 409 with email detail', async () => {
    ;(clinicsService.register as jest.Mock).mockRejectedValue({
      status: 409,
      title: 'Conflict',
      detail: 'Email already in use',
    })

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => {
      expect(screen.getByText('Este e-mail já está cadastrado')).toBeInTheDocument()
    })
  })

  it('does not send adminPasswordConfirm in the API payload', async () => {
    ;(clinicsService.register as jest.Mock).mockResolvedValue(makeResponse())

    renderWithProviders(<RegisterClinicForm />)

    await fillValidForm()
    await userEvent.click(screen.getByTestId('register-clinic-submit'))

    await waitFor(() => expect(clinicsService.register).toHaveBeenCalled())

    const [payload] = (clinicsService.register as jest.Mock).mock.calls[0]
    expect(payload).not.toHaveProperty('adminPasswordConfirm')
  })
})
