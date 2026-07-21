jest.mock('@/components/features/professionals/hooks/use-professional.hook')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ExameForm } from './exame-form'

const mockUseProfessional = useProfessional as jest.Mock

const defaultProps = {
  appointmentId: 'appt-uuid',
  professionalId: 'doctor-uuid',
  isPending: false,
  globalError: null,
  onSubmit: jest.fn(),
}

describe('ExameForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseProfessional.mockReturnValue({ data: undefined })
  })

  it('renders one item by default and the submit button', () => {
    renderWithProviders(<ExameForm {...defaultProps} />)
    expect(screen.getByTestId('exame-form-item-0')).toBeInTheDocument()
    expect(screen.queryByTestId('exame-form-item-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('exame-form-submit')).toBeInTheDocument()
  })

  it('adds a new item when clicking "+ Adicionar exame"', async () => {
    renderWithProviders(<ExameForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('exame-form-add-item'))
    expect(screen.getByTestId('exame-form-item-1')).toBeInTheDocument()
  })

  it('removes an item when clicking Remover (only when more than one item)', async () => {
    renderWithProviders(<ExameForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('exame-form-add-item'))
    expect(screen.getByTestId('exame-form-item-1')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('exame-form-item-remove-1'))
    expect(screen.queryByTestId('exame-form-item-1')).not.toBeInTheDocument()
  })

  it('does not show remove button when there is only one item', () => {
    renderWithProviders(<ExameForm {...defaultProps} />)
    expect(screen.queryByTestId('exame-form-item-remove-0')).not.toBeInTheDocument()
  })

  it('shows validation error when item name is empty on submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with a single item and no notes', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      appointmentId: 'appt-uuid',
      items: [{ name: 'Hemograma completo' }],
    })
    expect(onSubmit.mock.calls[0][0].notes).toBeUndefined()
  })

  it('includes the chosen CRM and specialty in the payload when the doctor has options', async () => {
    mockUseProfessional.mockReturnValue({
      data: {
        id: 'doctor-uuid',
        user: { id: 'user-uuid', fullName: 'Dr. Test', email: 'dr@example.com', isActive: true },
        registrations: [
          { id: 'crm-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true },
          { id: 'crm-2', councilType: 'crm', number: '67890', state: 'RJ', isPrimary: false },
        ],
        specialties: [
          { id: 'spec-1', name: 'Cardiologia', registryNumber: '111' },
          { id: 'spec-2', name: 'Mastologia', registryNumber: '222' },
        ],
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.selectOptions(screen.getByTestId('professional-signature-crm'), 'crm-2')
    await userEvent.selectOptions(screen.getByTestId('professional-signature-specialty'), 'spec-2')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ crmId: 'crm-2', specialtyId: 'spec-2' })
  })

  it('includes observations for an item when filled', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.type(screen.getByTestId('exame-form-item-observations-0'), 'Jejum de 8 horas')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].items[0]).toEqual({
      name: 'Hemograma completo',
      observations: 'Jejum de 8 horas',
    })
  })

  it('calls onSubmit with multiple items', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-add-item'))
    await userEvent.type(screen.getByTestId('exame-form-item-name-1'), 'Raio-X de tórax')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].items).toHaveLength(2)
    expect(onSubmit.mock.calls[0][0].items[1].name).toBe('Raio-X de tórax')
  })

  it('includes general notes when filled', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<ExameForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.type(screen.getByTestId('exame-form-notes'), 'Retornar em 7 dias')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].notes).toBe('Retornar em 7 dias')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<ExameForm {...defaultProps} isPending />)
    expect(screen.getByTestId('exame-form-submit')).toBeDisabled()
  })

  it('shows globalError alert', () => {
    renderWithProviders(<ExameForm {...defaultProps} globalError="Consulta cancelada." />)
    expect(screen.getByTestId('exame-form-error')).toHaveTextContent('Consulta cancelada.')
  })
})
