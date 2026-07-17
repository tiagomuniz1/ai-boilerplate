import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HowItWorks } from './how-it-works'
import { STEPS } from '../constants/landing-content'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('HowItWorks', () => {
  beforeEach(() => {
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders the heading and the steps', () => {
    const { container } = render(<HowItWorks />)
    expect(container.querySelector('#como-funciona')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comece hoje, em três passos.' })).toBeInTheDocument()
    expect(screen.getAllByTestId('step-card')).toHaveLength(STEPS.length)
  })

  it('opens the access request modal from the CTA', async () => {
    const user = userEvent.setup()
    render(<HowItWorks />)
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso ao sistema' }))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })
})
