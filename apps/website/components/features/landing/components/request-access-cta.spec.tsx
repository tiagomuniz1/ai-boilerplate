import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestAccessCta } from './request-access-cta'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('RequestAccessCta', () => {
  beforeEach(() => {
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders the given label', () => {
    render(<RequestAccessCta>Solicitar acesso</RequestAccessCta>)
    expect(screen.getByRole('button', { name: 'Solicitar acesso' })).toBeInTheDocument()
  })

  it('opens the access request modal when clicked', async () => {
    const user = userEvent.setup()
    render(<RequestAccessCta>Solicitar acesso</RequestAccessCta>)

    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })

  it('forwards variant, size and data-testid to the underlying button', () => {
    render(
      <RequestAccessCta variant="wine" size="lg" data-testid="cta">
        Ir
      </RequestAccessCta>,
    )
    const button = screen.getByTestId('cta')
    expect(button).toHaveClass('bg-wine')
    expect(button).toHaveClass('rounded-lg')
  })
})
