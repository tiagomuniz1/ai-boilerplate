import { useImageLightboxStore } from './image-lightbox.store'

describe('useImageLightboxStore', () => {
  beforeEach(() => {
    useImageLightboxStore.setState({ src: null, alt: '' })
  })

  it('starts closed', () => {
    expect(useImageLightboxStore.getState().src).toBeNull()
  })

  it('opens with the given src and alt', () => {
    useImageLightboxStore.getState().open('/screenshots/dashboard.png', 'Dashboard')
    expect(useImageLightboxStore.getState().src).toBe('/screenshots/dashboard.png')
    expect(useImageLightboxStore.getState().alt).toBe('Dashboard')
  })

  it('closes, clearing src and alt', () => {
    useImageLightboxStore.setState({ src: '/screenshots/dashboard.png', alt: 'Dashboard' })
    useImageLightboxStore.getState().close()
    expect(useImageLightboxStore.getState().src).toBeNull()
    expect(useImageLightboxStore.getState().alt).toBe('')
  })
})
