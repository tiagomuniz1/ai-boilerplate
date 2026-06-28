import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicationSource } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicationForm } from './medication-form'
import type { IMedicationModel } from '../types/medication-model.types'

const editDefaults: IMedicationModel = {
  id: 'm1',
  name: 'Dipirona Sódica',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: 'Genérico',
  therapeuticClass: 'ANALGESICOS',
  holderCompany: 'ACME',
  registrationNumber: '123',
  registrationStatus: 'Ativo',
  source: MedicationSource.ANVISA,
  isActive: true,
  createdAt: new Date('2024-01-01'),
}

describe('MedicationForm (integration)', () => {
  it('renders the global error when provided', () => {
    renderWithProviders(
      <MedicationForm mode="create" isPending={false} globalError="Falhou" onSubmit={jest.fn()} />,
    )
    expect(screen.getByTestId('medication-form-error')).toHaveTextContent('Falhou')
  })

  it('blocks submit and shows an error when the name is too short', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<MedicationForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('medication-form-name'), 'A')
    await userEvent.click(screen.getByTestId('medication-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Deve ter no mínimo 2 caracteres')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits only the name when the optional fields are left empty', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<MedicationForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('medication-form-name'), 'Dipirona')
    await userEvent.click(screen.getByTestId('medication-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Dipirona' })
  })

  it('submits every filled field on create', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<MedicationForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('medication-form-name'), 'Dipirona')
    await userEvent.type(screen.getByTestId('medication-form-active-ingredient'), 'dipirona')
    await userEvent.type(screen.getByTestId('medication-form-therapeutic-class'), 'Analgésicos')
    await userEvent.type(screen.getByTestId('medication-form-regulatory-category'), 'Genérico')
    await userEvent.type(screen.getByTestId('medication-form-holder-company'), 'ACME')
    await userEvent.type(screen.getByTestId('medication-form-registration-number'), '123')
    await userEvent.type(screen.getByTestId('medication-form-registration-status'), 'Ativo')
    await userEvent.click(screen.getByTestId('medication-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Dipirona',
      activeIngredient: 'dipirona',
      therapeuticClass: 'Analgésicos',
      regulatoryCategory: 'Genérico',
      holderCompany: 'ACME',
      registrationNumber: '123',
      registrationStatus: 'Ativo',
    })
  })

  it('sends undefined for optional fields cleared in edit mode', async () => {
    const onSubmit = jest.fn()
    const emptyDefaults: IMedicationModel = {
      ...editDefaults,
      activeIngredient: null,
      regulatoryCategory: null,
      therapeuticClass: null,
      holderCompany: null,
      registrationNumber: null,
      registrationStatus: null,
    }
    renderWithProviders(
      <MedicationForm mode="edit" defaultValues={emptyDefaults} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => expect(screen.getByTestId('medication-form-name')).toHaveValue('Dipirona Sódica'))
    await userEvent.click(screen.getByTestId('medication-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Dipirona Sódica',
      activeIngredient: undefined,
      regulatoryCategory: undefined,
      therapeuticClass: undefined,
      holderCompany: undefined,
      registrationNumber: undefined,
      registrationStatus: undefined,
      isActive: true,
    })
  })

  it('does not render the source field in create mode', () => {
    renderWithProviders(<MedicationForm mode="create" isPending={false} onSubmit={jest.fn()} />)
    expect(screen.queryByTestId('medication-form-source-readonly')).not.toBeInTheDocument()
  })

  it('populates fields and shows the readonly source in edit mode', async () => {
    renderWithProviders(
      <MedicationForm mode="edit" defaultValues={editDefaults} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('medication-form-name')).toHaveValue('Dipirona Sódica')
    })
    expect(screen.getByTestId('medication-form-source-readonly')).toHaveTextContent('ANVISA')
    expect(screen.getByTestId('medication-form-is-active')).toBeChecked()
  })

  it('submits the edited values including isActive', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicationForm mode="edit" defaultValues={editDefaults} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('medication-form-name')).toHaveValue('Dipirona Sódica')
    })
    await userEvent.click(screen.getByTestId('medication-form-is-active')) // uncheck
    await userEvent.click(screen.getByTestId('medication-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Dipirona Sódica', isActive: false }),
    )
  })

  it('disables the submit button while pending', () => {
    renderWithProviders(<MedicationForm mode="create" isPending onSubmit={jest.fn()} />)
    expect(screen.getByTestId('medication-form-submit')).toBeDisabled()
  })
})
