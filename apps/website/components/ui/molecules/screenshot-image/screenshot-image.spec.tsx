import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenshotImage } from './screenshot-image'
import { useImageLightboxStore } from '@/stores/image-lightbox.store'

describe('ScreenshotImage', () => {
  beforeEach(() => {
    useImageLightboxStore.setState({ src: null, alt: '' })
  })

  it('renders the image with the given alt text', () => {
    render(<ScreenshotImage src="/screenshots/dashboard.png" alt="Dashboard" width={800} height={600} />)
    expect(screen.getByAltText('Dashboard')).toBeInTheDocument()
  })

  it('opens the lightbox with the src and alt when clicked', async () => {
    const user = userEvent.setup()
    render(<ScreenshotImage src="/screenshots/dashboard.png" alt="Dashboard" width={800} height={600} />)

    await user.click(screen.getByTestId('screenshot-image-trigger'))

    expect(useImageLightboxStore.getState().src).toBe('/screenshots/dashboard.png')
    expect(useImageLightboxStore.getState().alt).toBe('Dashboard')
  })
})
