jest.mock('../use-cases/update-theme.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ThemeBorderRadius } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { updateThemeUseCase } from '../use-cases/update-theme.use-case'
import { useUpdateTheme } from './use-update-theme.hook'
import type { IThemeModel } from '../types/theme-model.types'

const mockPush = jest.fn()

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const themeId = 'uuid-1'

const input = {
  name: 'Azul Clínico Atualizado',
  accentColor: '#1D4ED8',
  accentSoftColor: '#BFDBFE',
  isDefault: true,
  borderRadius: ThemeBorderRadius.ROUND,
}

const model: IThemeModel = {
  id: themeId,
  name: 'Azul Clínico Atualizado',
  slug: 'azul-clinico',
  isDefault: true,
  accentColor: '#1D4ED8',
  accentSoftColor: '#BFDBFE',
  borderRadius: ThemeBorderRadius.ROUND,
  bgColor: null,
  bgDarkColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useUpdateTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateThemeUseCase with id and input', async () => {
    ;(updateThemeUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateTheme(themeId), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(updateThemeUseCase).toHaveBeenCalled()
      const [idArg, dataArg] = (updateThemeUseCase as jest.Mock).mock.calls[0]
      expect(idArg).toBe(themeId)
      expect(dataArg).toEqual(input)
    })
  })

  it('invalidates themes, theme by id and active theme queries, then navigates on success', async () => {
    ;(updateThemeUseCase as jest.Mock).mockResolvedValue(model)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTheme(themeId), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/test-clinic/themes'))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['themes'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['theme', themeId] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['theme', 'active'] })
  })

  it('does not navigate on error', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Theme not found' }
    ;(updateThemeUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateTheme(themeId), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
