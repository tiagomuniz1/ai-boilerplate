jest.mock('../services/vaccines.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vaccinesService } from '../services/vaccines.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { VaccineList } from './vaccine-list'

const mockService = vaccinesService as jest.Mocked<typeof vaccinesService>

const makeVaccineDto = (overrides: object = {}) => ({
  id: 'v-1',
  name: 'Tríplice viral',
  abbreviation: 'SCR',
  preventedDiseases: 'sarampo, caxumba, rubéola',
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const makePage = (items: object[], total = items.length) => ({ data: items, total, page: 1, limit: 20 })

describe('VaccineList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a skeleton while loading', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}) as never)
    renderWithProviders(<VaccineList />)
    expect(screen.getByTestId('vaccine-list-skeleton')).toBeInTheDocument()
  })

  it('renders an error state when the fetch fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<VaccineList />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-list-error')).toBeInTheDocument()
    })
  })

  it('renders an empty state', async () => {
    mockService.getAll.mockResolvedValue(makePage([]) as never)
    renderWithProviders(<VaccineList />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-list-empty')).toBeInTheDocument()
    })
  })

  it('renders name, abbreviation, prevented diseases and status', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    renderWithProviders(<VaccineList />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-list-table')).toBeInTheDocument()
    })

    const row = screen.getByTestId('vaccine-row-v-1')
    expect(row).toHaveTextContent('Tríplice viral')
    expect(row).toHaveTextContent('SCR')
    expect(row).toHaveTextContent('sarampo, caxumba, rubéola')
    expect(screen.getByTestId('vaccine-status-v-1')).toHaveTextContent('Ativa')
  })

  it('shows an inactive vaccine as such', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto({ isActive: false })]) as never)
    renderWithProviders(<VaccineList />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-v-1')).toHaveTextContent('Inativa')
    })
  })

  // Sem o debounce a busca dispara uma consulta por tecla, como acontece no
  // formulário de receita.
  it('debounces the search instead of querying on every keystroke', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    renderWithProviders(<VaccineList />)

    await waitFor(() => expect(mockService.getAll).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByTestId('vaccine-list-search'), 'rube')

    await waitFor(() => {
      expect(mockService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'rube' }),
      )
    })
    // Uma chamada inicial e uma após o debounce — nunca uma por tecla.
    expect(mockService.getAll.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('asks for inactive entries when the checkbox is ticked', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    renderWithProviders(<VaccineList />)

    await waitFor(() => expect(mockService.getAll).toHaveBeenCalled())
    await userEvent.click(screen.getByTestId('vaccine-list-include-inactive'))

    await waitFor(() => {
      expect(mockService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeInactive: true }),
      )
    })
  })

  it('deactivates a vaccine through the confirmation dialog', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    mockService.update.mockResolvedValue(makeVaccineDto({ isActive: false }) as never)

    renderWithProviders(<VaccineList />)

    await userEvent.click(await screen.findByTestId('vaccine-toggle-v-1'))
    expect(screen.getByTestId('vaccine-toggle-dialog-message')).toHaveTextContent(
      'As doses já registradas continuam na caderneta',
    )
    await userEvent.click(screen.getByTestId('vaccine-toggle-confirm'))

    await waitFor(() => {
      expect(mockService.update).toHaveBeenCalledWith('v-1', { isActive: false })
    })
  })

  it('deletes a vaccine through the confirmation dialog', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    mockService.remove.mockResolvedValue(undefined as never)

    renderWithProviders(<VaccineList />)

    await userEvent.click(await screen.findByTestId('vaccine-delete-v-1'))
    await userEvent.click(screen.getByTestId('vaccine-delete-confirm'))

    await waitFor(() => {
      expect(mockService.remove).toHaveBeenCalledWith('v-1')
    })
  })

  it('cancels the delete without calling the API', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)

    renderWithProviders(<VaccineList />)

    await userEvent.click(await screen.findByTestId('vaccine-delete-v-1'))
    await userEvent.click(screen.getByTestId('vaccine-delete-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('vaccine-delete-dialog-message')).not.toBeInTheDocument()
    })
    expect(mockService.remove).not.toHaveBeenCalled()
  })

  it('links each row to its edit page', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccineDto()]) as never)
    renderWithProviders(<VaccineList />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-edit-link-v-1')).toHaveAttribute(
        'href',
        '/backoffice/vaccines/v-1/edit',
      )
    })
  })
})
