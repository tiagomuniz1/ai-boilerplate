jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice') }))
jest.mock('../services/canonical-fields-admin.service')
jest.mock('../use-cases/update-canonical-field.use-case')

import { screen, waitFor } from '@testing-library/react'
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
})
