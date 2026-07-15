import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { CtaLink } from './cta-link'

describe('CtaLink', () => {
  it('renders an anchor with the given href and label', () => {
    render(<CtaLink href="https://example.com">Criar clínica</CtaLink>)
    const link = screen.getByRole('link', { name: 'Criar clínica' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('applies default primary + md classes', () => {
    render(<CtaLink href="#">Ir</CtaLink>)
    const link = screen.getByRole('link')
    expect(link).toHaveClass('bg-terracotta')
    expect(link).toHaveClass('rounded-lg')
  })

  it.each([
    ['outline', 'border-warm-white/30'],
    ['wine', 'bg-wine'],
    ['white', 'bg-warm-white'],
  ] as const)('applies the %s variant', (variant, expected) => {
    render(
      <CtaLink href="#" variant={variant}>
        Ir
      </CtaLink>,
    )
    expect(screen.getByRole('link')).toHaveClass(expected)
  })

  it.each([
    ['sm', 'rounded-md'],
    ['lg', 'rounded-lg'],
  ] as const)('applies the %s size', (size, expected) => {
    render(
      <CtaLink href="#" size={size}>
        Ir
      </CtaLink>,
    )
    expect(screen.getByRole('link')).toHaveClass(expected)
  })

  it('merges an extra className and passes through data attributes', () => {
    render(
      <CtaLink href="#" className="w-full" data-testid="cta">
        Ir
      </CtaLink>,
    )
    const link = screen.getByTestId('cta')
    expect(link).toHaveClass('w-full')
  })

  it('forwards the ref', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(
      <CtaLink href="#" ref={ref}>
        Ir
      </CtaLink>,
    )
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
  })
})
