jest.mock('../services/prescription-verification.service')

import { screen, waitFor } from '@testing-library/react'
import { CouncilType } from '@app/shared'
import type { VerifyPrescriptionResponseDto } from '@app/shared'
import { prescriptionVerificationService } from '../services/prescription-verification.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionVerification } from './prescription-verification'

const mockService = prescriptionVerificationService as jest.Mocked<typeof prescriptionVerificationService>

const makeDto = (overrides: Partial<VerifyPrescriptionResponseDto> = {}): VerifyPrescriptionResponseDto => ({
  clinicName: 'Clínica Saúde',
  professionalName: 'Dr. João Silva',
  professionalCouncilType: CouncilType.CRM,
  professionalRegistrationNumber: '12345/SP',
  specialtyName: 'Cardiologia',
  patientNameMasked: 'Maria S.',
  patientDocumentMasked: '***.***.789-**',
  issuedAt: '2026-01-05T10:00:00.000Z',
  items: [
    { name: 'Dipirona', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa' },
  ],
  ...overrides,
})

describe('PrescriptionVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the loading skeleton initially', () => {
    mockService.getByToken.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<PrescriptionVerification token="token-123" />)

    expect(screen.getByTestId('verification-loading')).toBeInTheDocument()
  })

  it('renders masked prescription data on success', async () => {
    mockService.getByToken.mockResolvedValue(makeDto())

    renderWithProviders(<PrescriptionVerification token="token-123" />)

    await waitFor(() => {
      expect(screen.getByTestId('verification-success')).toBeInTheDocument()
    })

    expect(screen.getByTestId('verification-clinic')).toHaveTextContent('Clínica Saúde')
    expect(screen.getByTestId('verification-doctor')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByText('CRM 12345/SP')).toBeInTheDocument()
    expect(screen.getByText('Cardiologia')).toBeInTheDocument()
  })

  it('renders the correct council label for a non-CRM professional', async () => {
    mockService.getByToken.mockResolvedValue(
      makeDto({ professionalName: 'Ana Nutricionista', professionalCouncilType: CouncilType.CRN, professionalRegistrationNumber: '9876543/SP' }),
    )

    renderWithProviders(<PrescriptionVerification token="token-123" />)

    await waitFor(() => {
      expect(screen.getByTestId('verification-success')).toBeInTheDocument()
    })

    expect(screen.getByText('CRN 9876543/SP')).toBeInTheDocument()
    expect(screen.getByTestId('verification-patient')).toHaveTextContent('Maria S.')
    expect(screen.getByText('CPF ***.***.789-**')).toBeInTheDocument()
    expect(screen.getByText('Dipirona 500mg')).toBeInTheDocument()
    expect(screen.getByText('dipirona sódica')).toBeInTheDocument()
    expect(screen.getByText('Quantidade: 1 caixa')).toBeInTheDocument()
  })

  it('does not render instructions or general notes (not part of the payload)', async () => {
    mockService.getByToken.mockResolvedValue(makeDto())

    renderWithProviders(<PrescriptionVerification token="token-123" />)

    await waitFor(() => {
      expect(screen.getByTestId('verification-success')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Tomar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Observações/i)).not.toBeInTheDocument()
  })

  it('renders a minimal item without dosage, active ingredient, quantity or specialty', async () => {
    mockService.getByToken.mockResolvedValue(
      makeDto({
        specialtyName: null,
        items: [{ name: 'Amoxicilina', activeIngredient: null, dosage: null, quantity: null }],
      }),
    )

    renderWithProviders(<PrescriptionVerification token="token-123" />)

    await waitFor(() => {
      expect(screen.getByTestId('verification-success')).toBeInTheDocument()
    })

    expect(screen.getByText('Amoxicilina')).toBeInTheDocument()
    expect(screen.queryByText('Cardiologia')).not.toBeInTheDocument()
    expect(screen.queryByText(/Quantidade:/)).not.toBeInTheDocument()
  })

  it('renders the invalid state when the token is not found', async () => {
    mockService.getByToken.mockRejectedValue(new Error('not found'))

    renderWithProviders(<PrescriptionVerification token="bad-token" />)

    await waitFor(() => {
      expect(screen.getByTestId('verification-invalid')).toBeInTheDocument()
    })

    expect(screen.getByText('Receita não encontrada ou inválida')).toBeInTheDocument()
    expect(screen.queryByTestId('verification-success')).not.toBeInTheDocument()
  })
})
