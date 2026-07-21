import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionPreviewModal } from './prescription-preview-modal'
import type { IPrescriptionModel } from '../types/prescription-model.types'

function makePrescription(overrides: Partial<IPrescriptionModel> = {}): IPrescriptionModel {
  return {
    id: 'rx-uuid',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    patientName: 'Maria Santos',
    professionalId: 'doctor-uuid',
    professionalName: 'Dr. João',
    issuedAt: new Date('2026-06-28T10:00:00.000Z'),
    items: [
      {
        medicationId: 'med-uuid',
        name: 'Dipirona 500mg',
        activeIngredient: 'dipirona sódica',
        dosage: null,
        quantity: null,
        instructions: 'Tomar 1 cp 8/8h',
      },
    ],
    notes: null,
    createdAt: new Date('2026-06-28T10:00:00.000Z'),
    ...overrides,
  }
}

describe('PrescriptionPreviewModal (integration)', () => {
  it('renders nothing when prescription is null', () => {
    const { container } = renderWithProviders(
      <PrescriptionPreviewModal prescription={null} onClose={jest.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders doctor, date and patient', () => {
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-professional')).toHaveTextContent('Dr. João')
    expect(screen.getByTestId('prescription-preview-patient')).toHaveTextContent('Maria Santos')
  })

  it('renders item name only when dosage is absent', () => {
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).toHaveTextContent('1. Dipirona 500mg')
  })

  it('renders item name with dosage when present', () => {
    const prescription = makePrescription({
      items: [
        {
          medicationId: 'med-uuid',
          name: 'Dipirona',
          activeIngredient: null,
          dosage: '500mg',
          quantity: null,
          instructions: 'Tomar 1 cp',
        },
      ],
    })
    renderWithProviders(<PrescriptionPreviewModal prescription={prescription} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).toHaveTextContent('1. Dipirona 500mg')
  })

  it('renders activeIngredient when present', () => {
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).toHaveTextContent('dipirona sódica')
  })

  it('does not render activeIngredient when absent', () => {
    const prescription = makePrescription({
      items: [
        {
          medicationId: null,
          name: 'Manipulado X',
          activeIngredient: null,
          dosage: null,
          quantity: null,
          instructions: 'Tomar 1 cp',
        },
      ],
    })
    renderWithProviders(<PrescriptionPreviewModal prescription={prescription} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).not.toHaveTextContent('dipirona sódica')
  })

  it('renders quantity when present', () => {
    const prescription = makePrescription({
      items: [
        {
          medicationId: 'med-uuid',
          name: 'Dipirona',
          activeIngredient: null,
          dosage: null,
          quantity: '1 caixa',
          instructions: 'Tomar 1 cp',
        },
      ],
    })
    renderWithProviders(<PrescriptionPreviewModal prescription={prescription} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).toHaveTextContent('Quantidade: 1 caixa')
  })

  it('does not render quantity when absent', () => {
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-item-0')).not.toHaveTextContent('Quantidade:')
  })

  it('renders notes when present', () => {
    const prescription = makePrescription({ notes: 'Retornar em 7 dias.' })
    renderWithProviders(<PrescriptionPreviewModal prescription={prescription} onClose={jest.fn()} />)
    expect(screen.getByTestId('prescription-preview-notes')).toHaveTextContent('Retornar em 7 dias.')
  })

  it('does not render notes section when absent', () => {
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={jest.fn()} />)
    expect(screen.queryByTestId('prescription-preview-notes')).not.toBeInTheDocument()
  })

  it('calls onClose when the modal is closed', async () => {
    const onClose = jest.fn()
    renderWithProviders(<PrescriptionPreviewModal prescription={makePrescription()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalled()
  })
})
