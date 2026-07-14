jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice'), useBasePath: () => '/backoffice' }))
jest.mock('../services/canonical-fields-admin.service')
jest.mock('../use-cases/update-canonical-field.use-case')

import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { updateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CanonicalFieldList } from './canonical-field-list'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: null,
  specialtyId: null,
  description: null,
  isActive: true,
  ...overrides,
})

describe('CanonicalFieldList (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders skeleton while loading', () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<CanonicalFieldList />)

    expect(screen.getByTestId('canonical-field-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with fields on success', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-key-uuid-1')).toHaveTextContent('blood_pressure')
    expect(screen.getByTestId('canonical-field-label-uuid-1')).toHaveTextContent('Pressão arterial')
    expect(screen.getByTestId('canonical-field-type-uuid-1')).toHaveTextContent('Número')
    expect(screen.getByTestId('canonical-field-status-uuid-1')).toHaveTextContent('Ativo')
  })

  it('renders Inativo status when field is inactive', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto({ isActive: false })])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-status-uuid-1')).toHaveTextContent('Inativo')
  })

  it('renders empty state when no fields returned', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-empty')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('canonical-field-list-table')).not.toBeInTheDocument()
  })

  it('renders error state on fetch failure', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockRejectedValue({ status: 500 })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-error')).toBeInTheDocument()
    })
  })

  it('renders new button linking to /backoffice/canonical-fields/new', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldList />)

    expect(screen.getByTestId('canonical-field-list-new-button')).toBeInTheDocument()
  })

  it('opens toggle dialog when toggle button is clicked', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))

    expect(screen.getByTestId('canonical-field-toggle-dialog-confirm')).toBeInTheDocument()
  })

  it('closes toggle dialog when cancel is clicked', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    expect(screen.getByTestId('canonical-field-toggle-dialog-cancel')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('canonical-field-toggle-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('calls updateCanonicalFieldUseCase and shows success message after confirm', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])
    ;(updateCanonicalFieldUseCase as jest.Mock).mockResolvedValue({ ...makeDto(), isActive: false })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-success')).toBeInTheDocument()
    })
  })

  it('shows error message and closes dialog when toggle fails', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])
    ;(updateCanonicalFieldUseCase as jest.Mock).mockRejectedValue({ status: 500 })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('canonical-field-toggle-dialog-confirm')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-list-toggle-error')).toBeInTheDocument()
  })

  it('renders edit link for each field', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-edit-link-uuid-1')).toBeInTheDocument()
  })

  it('renders include-inactive checkbox', () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldList />)

    expect(screen.getByTestId('canonical-field-list-include-inactive')).toBeInTheDocument()
  })

  it('toggles includeInactive when checkbox is clicked', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldList />)

    const checkbox = screen.getByTestId('canonical-field-list-include-inactive')
    expect(checkbox).not.toBeChecked()

    await userEvent.click(checkbox)

    expect(checkbox).toBeChecked()
  })

  it('clears success message after 5 second delay', async () => {
    const captured: Array<{ cb: () => void; delay: number }> = []
    const originalSetTimeout = global.setTimeout
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay?: number) => {
      if (typeof delay === 'number' && delay >= 4000) {
        captured.push({ cb, delay })
        return 0 as any
      }
      return originalSetTimeout(cb, delay)
    })

    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])
    ;(updateCanonicalFieldUseCase as jest.Mock).mockResolvedValue({ ...makeDto(), isActive: false })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-confirm'))

    await waitFor(() => expect(screen.getByTestId('canonical-field-list-success')).toBeInTheDocument())

    const cb5000 = captured.find((t) => t.delay === 5000)
    if (cb5000) act(() => cb5000.cb())

    await waitFor(() => expect(screen.queryByTestId('canonical-field-list-success')).not.toBeInTheDocument())

    spy.mockRestore()
  })

  it('clears toggle error message after 6 second delay', async () => {
    const captured: Array<{ cb: () => void; delay: number }> = []
    const originalSetTimeout = global.setTimeout
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay?: number) => {
      if (typeof delay === 'number' && delay >= 4000) {
        captured.push({ cb, delay })
        return 0 as any
      }
      return originalSetTimeout(cb, delay)
    })

    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])
    ;(updateCanonicalFieldUseCase as jest.Mock).mockRejectedValue({ status: 500 })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-confirm'))

    await waitFor(() => expect(screen.getByTestId('canonical-field-list-toggle-error')).toBeInTheDocument())

    const cb6000 = captured.find((t) => t.delay === 6000)
    if (cb6000) act(() => cb6000.cb())

    await waitFor(() => expect(screen.queryByTestId('canonical-field-list-toggle-error')).not.toBeInTheDocument())

    spy.mockRestore()
  })

  it('shows "ativado" success message when activating an inactive field', async () => {
    const inactiveField = makeDto({ isActive: false })
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([inactiveField])
    ;(updateCanonicalFieldUseCase as jest.Mock).mockResolvedValue({ ...inactiveField, isActive: true })

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))
    await userEvent.click(screen.getByTestId('canonical-field-toggle-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-success')).toBeInTheDocument()
    })
    expect(screen.getByTestId('canonical-field-list-success')).toHaveTextContent('ativado')
  })

  it('shows "Ativar campo" dialog title for inactive field', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto({ isActive: false })])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-toggle-button-uuid-1'))

    expect(screen.getByTestId('canonical-field-toggle-dialog-confirm')).toHaveTextContent('Ativar')
  })

  it('shows raw type value when field type is not in labels map', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([
      makeDto({ type: 'custom_type' as any }),
    ])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-type-uuid-1')).toHaveTextContent('custom_type')
  })

  it('renders a mobile card per field with label, key and type', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => expect(screen.getByTestId('canonical-field-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('canonical-field-card-uuid-1-title')).toHaveTextContent('Pressão arterial')
    expect(screen.getByTestId('canonical-field-card-uuid-1')).toHaveTextContent('blood_pressure')
    expect(screen.getByTestId('canonical-field-card-edit-link-uuid-1')).toBeInTheDocument()
  })

  it('mobile card toggle button opens the toggle dialog', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldList />)

    await waitFor(() => expect(screen.getByTestId('canonical-field-card-toggle-button-uuid-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('canonical-field-card-toggle-button-uuid-1'))

    expect(screen.getByTestId('canonical-field-toggle-dialog')).toBeInTheDocument()
  })
})
