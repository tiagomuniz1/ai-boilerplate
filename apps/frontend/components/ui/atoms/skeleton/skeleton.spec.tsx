import { render } from '@testing-library/react'
import { Skeleton } from './skeleton'

describe('Skeleton', () => {
    it('renders with animate-pulse class', () => {
        const { container } = render(<Skeleton />)
        expect(container.firstChild).toHaveClass('animate-pulse')
    })

    it('is aria-hidden', () => {
        const { container } = render(<Skeleton />)
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    })

    it('applies numeric width as px style', () => {
        const { container } = render(<Skeleton width={200} />)
        expect(container.firstChild).toHaveStyle({ width: '200px' })
    })

    it('applies string width directly', () => {
        const { container } = render(<Skeleton width="100%" />)
        expect(container.firstChild).toHaveStyle({ width: '100%' })
    })

    it('applies numeric height as px style', () => {
        const { container } = render(<Skeleton height={40} />)
        expect(container.firstChild).toHaveStyle({ height: '40px' })
    })

    it('merges className prop', () => {
        const { container } = render(<Skeleton className="custom-class" />)
        expect(container.firstChild).toHaveClass('custom-class')
    })
})
