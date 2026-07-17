import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinalCta } from './final-cta'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('FinalCta', () => {
  beforeEach(() => {
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders the closing heading', () => {
    render(<FinalCta />)
    expect(
      screen.getByRole('heading', {
        name: 'Sua clínica organizada, seus dados seguros. Comece agora.',
      }),
    ).toBeInTheDocument()
  })

  it('opens the access request modal from the CTA', async () => {
    const user = userEvent.setup()
    render(<FinalCta />)
    await user.click(screen.getByTestId('final-cta'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })
})
