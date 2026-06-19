import React from 'react'
import { render, screen, renderHook } from '@testing-library/react'
import { SlugProvider, useSlug, useClinicPath } from './slug-context'

function makeWrapper(slug: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(SlugProvider, { slug }, children)
  }
}

describe('SlugProvider / useSlug', () => {
  it('provides the slug value to consumers', () => {
    const { result } = renderHook(() => useSlug(), { wrapper: makeWrapper('test-clinic') })
    expect(result.current).toBe('test-clinic')
  })

  it('returns empty string when no provider is present', () => {
    const { result } = renderHook(() => useSlug())
    expect(result.current).toBe('')
  })

  it('renders children inside SlugProvider', () => {
    render(
      React.createElement(SlugProvider, { slug: 'my-clinic' },
        React.createElement('span', { 'data-testid': 'child' }, 'hello'),
      ),
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

describe('useClinicPath', () => {
  it('prepends the slug to the given path', () => {
    const { result } = renderHook(() => useClinicPath('/dashboard'), { wrapper: makeWrapper('my-clinic') })
    expect(result.current).toBe('/my-clinic/dashboard')
  })

  it('works with empty slug', () => {
    const { result } = renderHook(() => useClinicPath('/dashboard'))
    expect(result.current).toBe('//dashboard')
  })
})
