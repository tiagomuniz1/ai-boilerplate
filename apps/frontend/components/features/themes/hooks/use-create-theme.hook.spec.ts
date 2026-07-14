jest.mock('../use-cases/create-theme.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ThemeBorderRadius } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { createThemeUseCase } from '../use-cases/create-theme.use-case'
import { useCreateTheme } from './use-create-theme.hook'
import type { IThemeModel } from '../types/theme-model.types'

const mockPush = jest.fn()

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const input = {
  name: 'Azul Clínico',
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  isDefault: false,
  borderRadius: ThemeBorderRadius.DEFAULT,
}

const model: IThemeModel = {
  id: 'uuid-1',
  name: 'Azul Clínico',
  slug: 'azul-clinico',
  isDefault: false,
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  borderRadius: ThemeBorderRadius.DEFAULT,
  bgColor: null,
  bgDarkColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useCreateTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createThemeUseCase with input', async () => {
    ;(createThemeUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateTheme(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createThemeUseCase).toHaveBeenCalled()
      const [firstArg] = (createThemeUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates themes query and navigates to /themes on success', async () => {
    ;(createThemeUseCase as jest.Mock).mockResolvedValue(model)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateTheme(), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/test-clinic/themes'))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['themes'] })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(createThemeUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateTheme(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
