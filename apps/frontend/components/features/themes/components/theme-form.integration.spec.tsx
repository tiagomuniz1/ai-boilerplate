jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { ThemeBorderRadius } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ThemeForm } from './theme-form'
import type { IThemeModel } from '../types/theme-model.types'

const mockPush = jest.fn()

const existingTheme: IThemeModel = {
  id: 'uuid-1',
  name: 'Azul Clínico',
  slug: 'azul-clinico',
  isDefault: false,
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  borderRadius: ThemeBorderRadius.DEFAULT,
  bgColor: null,
  bgDarkColor: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
}

describe('ThemeForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all fields including slug in create mode', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('theme-form-name')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-slug')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-accent-color')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-accent-soft-color')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-bg-color')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-bg-dark-color')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-radius-selector')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-is-default')).toBeInTheDocument()
    expect(screen.getByTestId('theme-form-submit')).toBeInTheDocument()
  })

  it('calls onSubmit with valid form values including slug', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.clear(screen.getByTestId('theme-form-name'))
    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-slug'))
    await userEvent.type(screen.getByTestId('theme-form-slug'), 'azul-clinico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Azul Clínico',
          slug: 'azul-clinico',
          accentColor: '#2563EB',
          accentSoftColor: '#DBEAFE',
        }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit without slug when slug field is empty', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.clear(screen.getByTestId('theme-form-name'))
    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({ slug: expect.anything() }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with bgColor when provided', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.clear(screen.getByTestId('theme-form-bg-color'))
    await userEvent.type(screen.getByTestId('theme-form-bg-color'), '#F7F6F3')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bgColor: '#F7F6F3' }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with bgDarkColor when provided', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.clear(screen.getByTestId('theme-form-bg-dark-color'))
    await userEvent.type(screen.getByTestId('theme-form-bg-dark-color'), '#0B1220')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bgDarkColor: '#0B1220' }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error when name is too short', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.clear(screen.getByTestId('theme-form-name'))
    await userEvent.type(screen.getByTestId('theme-form-name'), 'AB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid accentColor format', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), 'invalid')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByText('Cor inválida — use formato hex #RRGGBB').length).toBeGreaterThan(0)
    })
  })

  it('shows validation error for invalid bgColor format', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.type(screen.getByTestId('theme-form-bg-color'), 'invalid')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByText('Cor inválida — use formato hex #RRGGBB').length).toBeGreaterThan(0)
    })
  })

  it('shows validation error for invalid bgDarkColor format', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.type(screen.getByTestId('theme-form-bg-dark-color'), 'invalid')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByText('Cor inválida — use formato hex #RRGGBB').length).toBeGreaterThan(0)
    })
  })

  it('changing accentColor picker updates accentColor text input', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const picker = document.getElementById('accentColor-picker') as HTMLInputElement
    fireEvent.change(picker, { target: { value: '#ff0000' } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-accent-color')).toHaveValue('#ff0000')
    })
  })

  it('changing accentSoftColor picker updates accentSoftColor text input', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const picker = document.getElementById('accentSoftColor-picker') as HTMLInputElement
    fireEvent.change(picker, { target: { value: '#aabbcc' } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-accent-soft-color')).toHaveValue('#aabbcc')
    })
  })

  it('changing bgColor picker updates bgColor text input', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const picker = document.getElementById('bgColor-picker') as HTMLInputElement
    fireEvent.change(picker, { target: { value: '#ff0000' } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-color')).toHaveValue('#ff0000')
    })
  })

  it('changing bgDarkColor picker updates bgDarkColor text input', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const picker = document.getElementById('bgDarkColor-picker') as HTMLInputElement
    fireEvent.change(picker, { target: { value: '#001122' } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-dark-color')).toHaveValue('#001122')
    })
  })

  it('shows validation error for invalid slug format', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.type(screen.getByTestId('theme-form-slug'), 'Invalid Slug!')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Slug deve ser kebab-case (ex: azul-clinico)')).toBeInTheDocument()
    })
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <ThemeForm
        mode="create"
        isPending={false}
        globalError="Já existe um tema com este slug."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('theme-form-error')).toHaveTextContent('Já existe um tema com este slug.')
  })

  it('does not show global error when globalError is null', () => {
    renderWithProviders(
      <ThemeForm mode="create" isPending={false} globalError={null} onSubmit={jest.fn()} />,
    )

    expect(screen.queryByTestId('theme-form-error')).not.toBeInTheDocument()
  })

  it('disables submit button when isPending is true', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('theme-form-submit')).toBeDisabled()
  })

  it('shows "Criar tema" label when not pending', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('theme-form-submit')).toHaveTextContent('Criar tema')
  })

  it('shows "Salvando..." label when isPending', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('theme-form-submit')).toHaveTextContent('Salvando...')
  })

  it('shows color preview when both accentColor and accentSoftColor are valid hex', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-preview')).toBeInTheDocument()
    })
  })

  it('does not show color preview when accentColor is invalid', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.queryByTestId('theme-form-preview')).not.toBeInTheDocument()
  })

  it('selecting a radius option updates the selection', async () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const sharpButton = screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.SHARP}`)
    await userEvent.click(sharpButton)

    expect(sharpButton).toHaveClass('border-accent')
  })

  it('renders all three radius options', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.SHARP}`)).toBeInTheDocument()
    expect(screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.DEFAULT}`)).toBeInTheDocument()
    expect(screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.ROUND}`)).toBeInTheDocument()
  })

  it('isDefault checkbox is unchecked by default', () => {
    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('theme-form-is-default')).not.toBeChecked()
  })

  it('calls onSubmit with isDefault: true when checkbox is checked', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<ThemeForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('theme-form-name'), 'Azul Clínico')
    await userEvent.clear(screen.getByTestId('theme-form-accent-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-color'), '#2563EB')
    await userEvent.clear(screen.getByTestId('theme-form-accent-soft-color'))
    await userEvent.type(screen.getByTestId('theme-form-accent-soft-color'), '#DBEAFE')
    await userEvent.click(screen.getByTestId('theme-form-is-default'))

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
        expect.any(Function),
      )
    })
  })
})

describe('ThemeForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('does not render slug field in edit mode', async () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-name')).toHaveValue('Azul Clínico')
    })

    expect(screen.queryByTestId('theme-form-slug')).not.toBeInTheDocument()
  })

  it('pre-fills form with existing theme data', async () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-name')).toHaveValue('Azul Clínico')
      expect(screen.getByTestId('theme-form-accent-color')).toHaveValue('#2563EB')
      expect(screen.getByTestId('theme-form-accent-soft-color')).toHaveValue('#DBEAFE')
    })
  })

  it('calls onSubmit with updated values in edit mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-name')).toHaveValue('Azul Clínico')
    })

    await userEvent.clear(screen.getByTestId('theme-form-name'))
    await userEvent.type(screen.getByTestId('theme-form-name'), 'Verde Natural')

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Verde Natural' }),
        expect.any(Function),
      )
    })
  })

  it('shows "Salvar alterações" label in edit mode when not pending', async () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-submit')).toHaveTextContent('Salvar alterações')
    })
  })

  it('shows "Salvando..." label when isPending in edit mode', () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('theme-form-submit')).toHaveTextContent('Salvando...')
  })

  it('disables submit button when isPending in edit mode', () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('theme-form-submit')).toBeDisabled()
  })

  it('shows global error in edit mode when provided', () => {
    renderWithProviders(
      <ThemeForm
        mode="edit"
        defaultValues={existingTheme}
        isPending={false}
        globalError="Erro ao atualizar tema."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('theme-form-error')).toHaveTextContent('Erro ao atualizar tema.')
  })

  it('does not show global error in edit mode when globalError is null', () => {
    renderWithProviders(
      <ThemeForm
        mode="edit"
        defaultValues={existingTheme}
        isPending={false}
        globalError={null}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.queryByTestId('theme-form-error')).not.toBeInTheDocument()
  })

  it('shows color preview in edit mode when colors are valid', async () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-preview')).toBeInTheDocument()
    })
  })

  it('pre-fills bgColor when defaultValues has bgColor', async () => {
    const themeWithBg: IThemeModel = { ...existingTheme, bgColor: '#F7F6F3' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBg} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-color')).toHaveValue('#F7F6F3')
    })
  })

  it('pre-fills bgDarkColor when defaultValues has bgDarkColor', async () => {
    const themeWithBgDark: IThemeModel = { ...existingTheme, bgDarkColor: '#0B1220' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBgDark} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-dark-color')).toHaveValue('#0B1220')
    })
  })

  it('calls onSubmit with bgColor when bgColor is non-empty in edit mode', async () => {
    const onSubmit = jest.fn()
    const themeWithBg: IThemeModel = { ...existingTheme, bgColor: '#F7F6F3' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBg} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-color')).toHaveValue('#F7F6F3')
    })

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bgColor: '#F7F6F3' }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with bgDarkColor when bgDarkColor is non-empty in edit mode', async () => {
    const onSubmit = jest.fn()
    const themeWithBgDark: IThemeModel = { ...existingTheme, bgDarkColor: '#0B1220' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBgDark} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-bg-dark-color')).toHaveValue('#0B1220')
    })

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ bgDarkColor: '#0B1220' }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit without bgColor when bgColor is empty in edit mode', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-name')).toHaveValue('Azul Clínico')
    })

    await userEvent.click(screen.getByTestId('theme-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({ bgColor: expect.anything() }),
        expect.any(Function),
      )
    })
  })

  it('selecting a radius option updates the selection in edit mode', async () => {
    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={existingTheme} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-name')).toHaveValue('Azul Clínico')
    })

    const roundButton = screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.ROUND}`)
    await userEvent.click(roundButton)

    expect(roundButton).toHaveClass('border-accent')
  })

  it('color picker reflects bgColor when bgColor is a valid hex', async () => {
    const themeWithBg: IThemeModel = { ...existingTheme, bgColor: '#FAF0F1' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBg} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      const picker = document.getElementById('bgColor-picker') as HTMLInputElement
      expect(picker?.value).toBe('#faf0f1')
    })
  })

  it('color picker reflects bgDarkColor when bgDarkColor is a valid hex', async () => {
    const themeWithBgDark: IThemeModel = { ...existingTheme, bgDarkColor: '#1A0D10' }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeWithBgDark} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      const picker = document.getElementById('bgDarkColor-picker') as HTMLInputElement
      expect(picker?.value).toBe('#1a0d10')
    })
  })

  it('uses DEFAULT radius when defaultValues.borderRadius is null', async () => {
    const themeNullRadius = {
      ...existingTheme,
      borderRadius: null as unknown as ThemeBorderRadius,
    }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeNullRadius} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId(`theme-form-radius-${ThemeBorderRadius.DEFAULT}`)).toHaveClass(
        'border-accent',
      )
    })
  })

  it('pre-fills isDefault checkbox from defaultValues', async () => {
    const themeAsDefault: IThemeModel = { ...existingTheme, isDefault: true }

    renderWithProviders(
      <ThemeForm mode="edit" defaultValues={themeAsDefault} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('theme-form-is-default')).toBeChecked()
    })
  })
})
