import { render, screen } from '@testing-library/react'
import { MediaPlaceholder } from './media-placeholder'

describe('MediaPlaceholder', () => {
  it('renders the caption and defaults to dark tone + 16/11 aspect', () => {
    const { container } = render(<MediaPlaceholder>legenda</MediaPlaceholder>)
    expect(screen.getByText('legenda')).toBeInTheDocument()
    const box = container.firstChild as HTMLElement
    expect(box).toHaveClass('bg-placeholder-dark')
    expect(box).toHaveClass('aspect-[16/11]')
  })

  it('applies the light tone', () => {
    const { container } = render(<MediaPlaceholder tone="light">x</MediaPlaceholder>)
    expect(container.firstChild).toHaveClass('bg-placeholder-light')
  })

  it('accepts a custom aspect and extra className', () => {
    const { container } = render(
      <MediaPlaceholder aspectClassName="aspect-[3/4]" className="shadow-hero">
        x
      </MediaPlaceholder>,
    )
    const box = container.firstChild as HTMLElement
    expect(box).toHaveClass('aspect-[3/4]')
    expect(box).toHaveClass('shadow-hero')
  })
})
