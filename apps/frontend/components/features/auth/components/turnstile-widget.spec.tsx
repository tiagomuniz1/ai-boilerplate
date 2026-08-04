let capturedOnLoad: (() => void) | undefined

jest.mock('next/script', () => ({
  __esModule: true,
  default: (props: { onLoad?: () => void }) => {
    capturedOnLoad = props.onLoad
    return null
  },
}))

import { act, render } from '@testing-library/react'
import { TurnstileWidget } from './turnstile-widget'

describe('TurnstileWidget', () => {
  const mockRender = jest.fn().mockReturnValue('widget-id-1')
  const mockRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnLoad = undefined
    window.turnstile = { render: mockRender, remove: mockRemove }
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key'
  })

  afterEach(() => {
    delete (window as { turnstile?: unknown }).turnstile
  })

  it('does not render the Turnstile widget before the script loads', () => {
    render(<TurnstileWidget onVerify={jest.fn()} />)
    expect(mockRender).not.toHaveBeenCalled()
  })

  it('renders the widget with the configured site key once the script loads', () => {
    render(<TurnstileWidget onVerify={jest.fn()} />)
    act(() => capturedOnLoad?.())

    expect(mockRender).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ sitekey: 'test-site-key', callback: expect.any(Function) }),
    )
  })

  it('calls onVerify with the token produced by the widget callback', () => {
    const onVerify = jest.fn()
    render(<TurnstileWidget onVerify={onVerify} />)
    act(() => capturedOnLoad?.())

    const { callback } = mockRender.mock.calls[0][1]
    callback('solved-token')

    expect(onVerify).toHaveBeenCalledWith('solved-token')
  })

  it('removes the widget on unmount', () => {
    const { unmount } = render(<TurnstileWidget onVerify={jest.fn()} />)
    act(() => capturedOnLoad?.())

    unmount()

    expect(mockRemove).toHaveBeenCalledWith('widget-id-1')
  })

  it('falls back to an empty sitekey when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set', () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    render(<TurnstileWidget onVerify={jest.fn()} />)
    act(() => capturedOnLoad?.())

    expect(mockRender).toHaveBeenCalledWith(expect.any(HTMLDivElement), expect.objectContaining({ sitekey: '' }))
  })

  it('does nothing when the script loads but window.turnstile is unavailable', () => {
    delete (window as { turnstile?: unknown }).turnstile
    render(<TurnstileWidget onVerify={jest.fn()} />)

    expect(() => act(() => capturedOnLoad?.())).not.toThrow()
    expect(mockRender).not.toHaveBeenCalled()
  })
})
