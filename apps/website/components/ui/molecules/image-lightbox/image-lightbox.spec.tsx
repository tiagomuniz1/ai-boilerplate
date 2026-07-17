import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageLightbox } from './image-lightbox'
import { useImageLightboxStore } from '@/stores/image-lightbox.store'

describe('ImageLightbox', () => {
  beforeEach(() => {
    useImageLightboxStore.setState({ src: null, alt: '' })
  })

  it('renders nothing when there is no image open', () => {
    render(<ImageLightbox />)
    expect(screen.queryByTestId('image-lightbox')).not.toBeInTheDocument()
  })

  it('renders the image when the store has a src', () => {
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    render(<ImageLightbox />)
    expect(screen.getByAltText('Dashboard')).toHaveAttribute('src', '/screenshots/dashboard.png')
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    render(<ImageLightbox />)

    await user.click(screen.getByTestId('image-lightbox-close'))

    expect(useImageLightboxStore.getState().src).toBeNull()
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    render(<ImageLightbox />)

    await user.click(screen.getByTestId('image-lightbox-backdrop'))

    expect(useImageLightboxStore.getState().src).toBeNull()
  })

  it('does not close when clicking inside the image container', async () => {
    const user = userEvent.setup()
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    render(<ImageLightbox />)

    await user.click(screen.getByTestId('image-lightbox'))

    expect(useImageLightboxStore.getState().src).toBe('/screenshots/dashboard.png')
  })

  it('closes when the Escape key is pressed', async () => {
    const user = userEvent.setup()
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    render(<ImageLightbox />)

    await user.keyboard('{Escape}')

    expect(useImageLightboxStore.getState().src).toBeNull()
  })
})
