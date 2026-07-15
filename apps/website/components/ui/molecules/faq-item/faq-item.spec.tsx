import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaqItem } from './faq-item'

describe('FaqItem', () => {
  it('shows a "+" sign and hides the answer when closed', () => {
    render(<FaqItem question="Preciso instalar?" answer="Não." isOpen={false} onToggle={jest.fn()} />)
    expect(screen.getByText('Preciso instalar?')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.queryByText('Não.')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows a "–" sign and the answer when open', () => {
    render(<FaqItem question="Preciso instalar?" answer="Não." isOpen onToggle={jest.fn()} />)
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(screen.getByText('Não.')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onToggle when the header is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    render(<FaqItem question="Q" answer="A" isOpen={false} onToggle={onToggle} />)
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
