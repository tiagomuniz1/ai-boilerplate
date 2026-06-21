jest.mock('../services/canonical-fields.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CanonicalFieldPicker } from './canonical-field-picker'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'mmHg',
  specialtyId: null,
  description: null,
  isActive: true,
  ...overrides,
})

describe('CanonicalFieldPicker (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders loading state initially', () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<CanonicalFieldPicker onAdopt={jest.fn()} />)

    expect(screen.getByTestId('canonical-field-picker-loading')).toBeInTheDocument()
  })

  it('renders fields when loaded', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldPicker onAdopt={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-picker-item-uuid-1')).toBeInTheDocument()
    expect(screen.getByText('Pressão arterial')).toBeInTheDocument()
  })

  it('renders empty state when no fields returned', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldPicker onAdopt={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker-empty')).toBeInTheDocument()
    })
  })

  it('renders error state on fetch failure', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockRejectedValue(new Error('error'))

    renderWithProviders(<CanonicalFieldPicker onAdopt={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker-error')).toBeInTheDocument()
    })
  })

  it('calls onAdopt with field model when adopt button clicked', async () => {
    const mockOnAdopt = jest.fn()
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([makeDto()])

    renderWithProviders(<CanonicalFieldPicker onAdopt={mockOnAdopt} />)

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-picker-adopt-uuid-1')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('canonical-field-picker-adopt-uuid-1'))

    expect(mockOnAdopt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uuid-1', canonicalKey: 'blood_pressure', label: 'Pressão arterial' }),
    )
  })

  it('passes specialtyId to service when provided', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])

    renderWithProviders(<CanonicalFieldPicker specialtyId="spec-uuid" onAdopt={jest.fn()} />)

    await waitFor(() => {
      expect(canonicalFieldsService.getAll).toHaveBeenCalledWith('spec-uuid')
    })
  })
})
