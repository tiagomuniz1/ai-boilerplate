import { screen } from '@testing-library/react'
import { MedicationSource } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicationToggleDialog } from './medication-toggle-dialog'
import type { IMedicationModel } from '../types/medication-model.types'

const medication: IMedicationModel = {
  id: 'm1',
  name: 'Dipirona',
  activeIngredient: null,
  regulatoryCategory: null,
  therapeuticClass: null,
  holderCompany: null,
  registrationNumber: null,
  registrationStatus: null,
  source: MedicationSource.MANUAL,
  isActive: true,
  createdAt: new Date('2024-01-01'),
}

describe('MedicationToggleDialog', () => {
  it('renders nothing when no medication is provided', () => {
    const { container } = renderWithProviders(
      <MedicationToggleDialog
        medication={null}
        isOpen={false}
        isPending={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the deactivate copy for an active medication', () => {
    renderWithProviders(
      <MedicationToggleDialog
        medication={medication}
        isOpen
        isPending={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(screen.getByTestId('medication-toggle-dialog')).toHaveTextContent('Desativar medicamento')
    expect(screen.getByTestId('medication-toggle-dialog-confirm')).toHaveTextContent('Desativar')
  })

  it('shows the activate copy for an inactive medication', () => {
    renderWithProviders(
      <MedicationToggleDialog
        medication={{ ...medication, isActive: false }}
        isOpen
        isPending={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(screen.getByTestId('medication-toggle-dialog')).toHaveTextContent('Ativar medicamento')
    expect(screen.getByTestId('medication-toggle-dialog-confirm')).toHaveTextContent('Ativar')
  })
})
