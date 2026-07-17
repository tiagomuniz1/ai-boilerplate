import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { CtaButton } from './cta-button'

describe('CtaButton', () => {
  it('renders a button with the given label and type="button" by default', () => {
    render(<CtaButton>Solicitar acesso</CtaButton>)
    const button = screen.getByRole('button', { name: 'Solicitar acesso' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('applies default primary + md classes', () => {
    render(<CtaButton>Ir</CtaButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-terracotta')
    expect(button).toHaveClass('rounded-lg')
  })

  it.each([
    ['outline', 'border-warm-white/30'],
    ['wine', 'bg-wine'],
    ['white', 'bg-warm-white'],
  ] as const)('applies the %s variant', (variant, expected) => {
    render(<CtaButton variant={variant}>Ir</CtaButton>)
    expect(screen.getByRole('button')).toHaveClass(expected)
  })

  it.each([
    ['sm', 'rounded-md'],
    ['lg', 'rounded-lg'],
  ] as const)('applies the %s size', (size, expected) => {
    render(<CtaButton size={size}>Ir</CtaButton>)
    expect(screen.getByRole('button')).toHaveClass(expected)
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    render(<CtaButton onClick={onClick}>Ir</CtaButton>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('merges an extra className and passes through data attributes', () => {
    render(
      <CtaButton className="w-full" data-testid="cta">
        Ir
      </CtaButton>,
    )
    expect(screen.getByTestId('cta')).toHaveClass('w-full')
  })

  it('forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<CtaButton ref={ref}>Ir</CtaButton>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
