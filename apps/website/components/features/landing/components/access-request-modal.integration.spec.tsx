jest.mock('../services/access-requests.service')

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccessRequestModal } from './access-request-modal'
import { accessRequestsService } from '../services/access-requests.service'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

const mockCreate = accessRequestsService.create as jest.Mock

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo'), 'Ana Costa')
  await user.type(screen.getByLabelText('E-mail'), 'ana@clinica.com')
  await user.type(screen.getByLabelText('Nome da clínica'), 'Clínica do Vale')
}

describe('AccessRequestModal (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders nothing when closed', () => {
    render(<AccessRequestModal />)
    expect(screen.queryByTestId('access-request-modal')).not.toBeInTheDocument()
  })

  it('renders the form when open', () => {
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)
    expect(screen.getByTestId('access-request-form')).toBeInTheDocument()
  })

  it('submits the form and shows a success message', async () => {
    const user = userEvent.setup()
    mockCreate.mockResolvedValue(undefined)
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    await waitFor(() => expect(screen.getByTestId('access-request-success')).toBeInTheDocument())
    expect(mockCreate).toHaveBeenCalledWith({
      fullName: 'Ana Costa',
      email: 'ana@clinica.com',
      clinicName: 'Clínica do Vale',
    })
  })

  it('includes phone when filled in', async () => {
    const user = userEvent.setup()
    mockCreate.mockResolvedValue(undefined)
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await fillForm(user)
    await user.type(screen.getByLabelText(/Telefone/), '11999998888')
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '11999998888' }),
      ),
    )
  })

  it('shows an error message when the request fails', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('network error'))
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    await waitFor(() => expect(screen.getByTestId('access-request-error')).toBeInTheDocument())
    expect(screen.queryByTestId('access-request-success')).not.toBeInTheDocument()
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await user.click(screen.getByTestId('access-request-close'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(false)
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await user.click(screen.getByTestId('access-request-backdrop'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(false)
  })

  it('does not close when clicking inside the dialog', async () => {
    const user = userEvent.setup()
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await user.click(screen.getByTestId('access-request-modal'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })

  it('closes when the Escape key is pressed', async () => {
    const user = userEvent.setup()
    useAccessRequestModalStore.setState({ isOpen: true })
    render(<AccessRequestModal />)

    await user.keyboard('{Escape}')
    expect(useAccessRequestModalStore.getState().isOpen).toBe(false)
  })
})
