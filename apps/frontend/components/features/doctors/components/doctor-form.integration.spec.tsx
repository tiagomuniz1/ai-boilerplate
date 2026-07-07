jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')
jest.mock('@/components/features/users/services/users.service')
jest.mock('@/components/features/clinic-specialties/services/clinic-specialties.service')
jest.mock('@/stores/auth.store')

import { screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { userService } from '@/components/features/users/services/users.service'
import { clinicSpecialtiesService } from '@/components/features/clinic-specialties/services/clinic-specialties.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorForm } from './doctor-form'
import type { IDoctorModel } from '../types/doctor-model.types'

const mockPush = jest.fn()

const mockUsers = [
  { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', role: 'user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
]

const CLINIC_ID = 'clinic-uuid-1'
const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockClinicSpecialties = [
  { id: 'link-uuid-1', clinicId: CLINIC_ID, specialtyId: SPEC_ID_1, name: 'Cardiologia', description: null, linkedAt: new Date() },
  { id: 'link-uuid-2', clinicId: CLINIC_ID, specialtyId: SPEC_ID_2, name: 'Neurologia', description: null, linkedAt: new Date() },
]

const mockAdminUser = { id: 'auth-user-id', fullName: 'Admin', email: 'admin@test.com', role: 'admin' as const, clinicId: CLINIC_ID }

const existingDoctor: IDoctorModel = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Cardiologia', rqe: '6789' }],
  bio: 'Bio inicial.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

function fillFirstCrm(number = '12345', state = 'SP') {
  fireEvent.change(screen.getByTestId('doctor-form-crm-number-0'), { target: { value: number } })
  fireEvent.change(screen.getByTestId('doctor-form-crm-state-0'), { target: { value: state } })
}

describe('DoctorForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof mockAdminUser }) => unknown) =>
      selector({ user: mockAdminUser }),
    )
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: mockUsers, total: 1, page: 1, limit: 100 })
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue({ data: mockClinicSpecialties, total: 2, page: 1, limit: 100 })
  })

  it('renders user mode toggle, crm list, specialties and bio fields', () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('doctor-form-user-mode')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-user-mode-existing')).toBeChecked()
    expect(screen.getByTestId('doctor-form-crm-group')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-crm-number-0')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-crm-primary-0')).toBeChecked()
    expect(screen.getByTestId('doctor-form-specialty-group')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-bio')).toBeInTheDocument()
  })

  it('shows user search by default (existing user mode)', () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('doctor-form-user-search')).toBeInTheDocument()
    expect(screen.queryByTestId('doctor-form-fullname')).not.toBeInTheDocument()
    expect(screen.queryByTestId('doctor-form-email')).not.toBeInTheDocument()
  })

  it('switches to fullName + email fields when new user mode is selected', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-user-mode-new'))

    expect(screen.queryByTestId('doctor-form-user-search')).not.toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-fullname')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-email')).toBeInTheDocument()
  })

  it('switches back to existing user mode when existing radio is selected after switching to new', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-user-mode-new'))
    expect(screen.getByTestId('doctor-form-fullname')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('doctor-form-user-mode-existing'))
    expect(screen.queryByTestId('doctor-form-fullname')).not.toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-user-search')).toBeInTheDocument()
  })

  it('renders specialty checkboxes after loading', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`)).toBeInTheDocument()
    })
  })

  it('filters non-digits from the CRM number field', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    fireEvent.change(screen.getByTestId('doctor-form-crm-number-0'), { target: { value: '12a3b4' } })

    expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('1234')
  })

  it('adds and removes CRM rows', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-crm-add'))
    expect(screen.getByTestId('doctor-form-crm-number-1')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-form-crm-primary-1')).not.toBeChecked()

    await userEvent.click(screen.getByTestId('doctor-form-crm-remove-1'))
    expect(screen.queryByTestId('doctor-form-crm-number-1')).not.toBeInTheDocument()
  })

  it('promotes the first remaining CRM to primary when the primary row is removed', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-crm-add'))
    // second row (index 1) becomes primary
    await userEvent.click(screen.getByTestId('doctor-form-crm-primary-1'))
    expect(screen.getByTestId('doctor-form-crm-primary-1')).toBeChecked()

    // remove the primary (index 1) -> row 0 becomes primary
    await userEvent.click(screen.getByTestId('doctor-form-crm-remove-1'))
    expect(screen.getByTestId('doctor-form-crm-primary-0')).toBeChecked()
  })

  it('calls onSubmit with userId, crms and specialties in existing user mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'João')
    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    await userEvent.click(screen.getByTestId('doctor-form-user-option'))

    fillFirstCrm('12345', 'SP')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          crms: [{ number: '12345', state: 'SP', isPrimary: true }],
          specialties: [{ specialtyId: SPEC_ID_1, rqe: undefined }],
        }),
        expect.any(Function),
      )
    })
  })

  it('captures the RQE typed for a selected specialty', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'João')
    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    await userEvent.click(screen.getByTestId('doctor-form-user-option'))

    fillFirstCrm('12345', 'SP')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    fireEvent.change(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`), { target: { value: '67ab89' } })

    expect(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`)).toHaveValue('6789')

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialties: [{ specialtyId: SPEC_ID_1, rqe: '6789' }],
        }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with fullName + email in new user mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('doctor-form-user-mode-new'))

    await userEvent.type(screen.getByTestId('doctor-form-fullname'), 'Dra. Maria Santos')
    await userEvent.type(screen.getByTestId('doctor-form-email'), 'maria@clinica.com')
    fillFirstCrm('54321', 'RJ')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dra. Maria Santos',
          email: 'maria@clinica.com',
          crms: [{ number: '54321', state: 'RJ', isPrimary: true }],
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error when no user is selected in existing mode', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione um usuário')).toBeInTheDocument()
    })
  })

  it('shows validation errors when fullName and email are missing in new user mode', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByTestId('doctor-form-user-mode-new'))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  it('shows validation error when the CRM is incomplete', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    // number filled but no UF selected
    fireEvent.change(screen.getByTestId('doctor-form-crm-number-0'), { target: { value: '12345' } })
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Preencha número e UF de todos os CRMs')).toBeInTheDocument()
    })
  })

  it('shows validation error when no specialty is selected', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'João')
    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    await userEvent.click(screen.getByTestId('doctor-form-user-option'))

    fillFirstCrm('12345', 'SP')
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione ao menos uma especialidade')).toBeInTheDocument()
    })
  })

  it('allows selecting multiple specialties', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'João')
    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    await userEvent.click(screen.getByTestId('doctor-form-user-option'))

    fillFirstCrm('12345', 'SP')

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`))

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialties: expect.arrayContaining([
            { specialtyId: SPEC_ID_1, rqe: undefined },
            { specialtyId: SPEC_ID_2, rqe: undefined },
          ]),
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

  it('deselects specialty when checkbox is clicked again in create mode', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()

    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).not.toBeChecked()
  })

  it('shows empty specialties message when no clinic specialties are available', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Nenhuma especialidade cadastrada.')).toBeInTheDocument()
    })
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

  it('shows "Nenhum usuário encontrado" when user search returns no results', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    fireEvent.change(screen.getByTestId('doctor-form-user-search'), { target: { value: 'xz' } })

    await waitFor(
      () => expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument(),
      { timeout: 2000 },
    )
  })

  it('shows "Buscando..." in dropdown while user search is fetching', async () => {
    jest.useFakeTimers()
    ;(userService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    fireEvent.change(screen.getByTestId('doctor-form-user-search'), { target: { value: 'Jo' } })

    act(() => { jest.advanceTimersByTime(300) })

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-user-search-results')).toBeInTheDocument()
    })

    expect(screen.getByText('Buscando...')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('clears user selection when typing again after selecting a user', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'João')

    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-option')).toBeInTheDocument(),
      { timeout: 2000 },
    )
    await userEvent.click(screen.getByTestId('doctor-form-user-option'))

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'x')

    await waitFor(() => {
      const input = screen.getByTestId('doctor-form-user-search') as HTMLInputElement
      expect(input.value).toContain('x')
    })
  })

  it('re-opens dropdown on focus when debouncedTerm has 2+ chars', async () => {
    renderWithProviders(<DoctorForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('doctor-form-user-search'), 'Jo')

    await waitFor(
      () => expect(screen.getByTestId('doctor-form-user-search-results')).toBeInTheDocument(),
      { timeout: 2000 },
    )

    await userEvent.tab()

    fireEvent.focus(screen.getByTestId('doctor-form-user-search'))

    await waitFor(() =>
      expect(screen.getByTestId('doctor-form-user-search-results')).toBeInTheDocument(),
    )
  })
})

describe('DoctorForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof mockAdminUser }) => unknown) =>
      selector({ user: mockAdminUser }),
    )
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue({ data: mockClinicSpecialties, total: 2, page: 1, limit: 100 })
  })

  it('pre-fills form with existing doctor crm, specialties and rqe', async () => {
    renderWithProviders(
      <DoctorForm
        mode="edit"
        defaultValues={existingDoctor}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
    })
    expect(screen.getByTestId('doctor-form-crm-state-0')).toHaveValue('SP')
    expect(screen.getByTestId('doctor-form-crm-primary-0')).toBeChecked()

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })
    expect(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`)).toHaveValue('6789')
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
    expect(screen.queryByTestId('doctor-form-user-search')).not.toBeInTheDocument()
  })

  it('calls onSubmit with updated crms and specialties', async () => {
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
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
    })

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_2}`))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          crms: [{ number: '12345', state: 'SP', isPrimary: true }],
          specialties: expect.arrayContaining([
            { specialtyId: SPEC_ID_1, rqe: '6789' },
            { specialtyId: SPEC_ID_2, rqe: undefined },
          ]),
        }),
        expect.any(Function),
      )
    })
  })

  it('updates the RQE of a pre-filled specialty in edit mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`)).toHaveValue('6789')
    })

    fireEvent.change(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`), { target: { value: '43a21' } })
    expect(screen.getByTestId(`doctor-form-rqe-${SPEC_ID_1}`)).toHaveValue('4321')

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialties: [{ specialtyId: SPEC_ID_1, rqe: '4321' }],
        }),
        expect.any(Function),
      )
    })
  })

  it('deselects pre-selected specialty when clicked in edit mode', async () => {
    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })

    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).not.toBeChecked()
  })

  it('pre-fills bio as empty string when doctor bio is null', async () => {
    const doctorNoBio: IDoctorModel = { ...existingDoctor, bio: null }

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={doctorNoBio} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
    })

    expect(screen.getByTestId('doctor-form-bio')).toHaveValue('')
  })

  it('submits with bio: undefined when bio is cleared', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
    })

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })

    await userEvent.clear(screen.getByTestId('doctor-form-bio'))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bio: undefined }),
        expect.any(Function),
      )
    })
  })

  it('submits without isActive when user is not admin', async () => {
    const onSubmit = jest.fn()
    const nonAdminUser = { ...mockAdminUser, role: 'user' as const }
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: { user: typeof nonAdminUser }) => unknown) =>
      selector({ user: nonAdminUser }),
    )

    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
    })

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })

    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: undefined }),
        expect.any(Function),
      )
    })
  })

  it('shows specialty validation error when all specialties are deselected and form is submitted', async () => {
    renderWithProviders(
      <DoctorForm mode="edit" defaultValues={existingDoctor} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`)).toBeChecked()
    })

    await userEvent.click(screen.getByTestId(`doctor-form-specialty-${SPEC_ID_1}`))
    await userEvent.click(screen.getByTestId('doctor-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione ao menos uma especialidade')).toBeInTheDocument()
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
      expect(screen.getByTestId('doctor-form-crm-number-0')).toHaveValue('12345')
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
