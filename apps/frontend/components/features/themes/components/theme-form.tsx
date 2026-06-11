'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ThemeBorderRadius } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import type { ICreateThemeInput, IUpdateThemeInput } from '../types/theme-input.types'
import type { IThemeModel } from '../types/theme-model.types'

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

const RADIUS_OPTIONS: { value: ThemeBorderRadius; label: string; preview: string }[] = [
  { value: ThemeBorderRadius.SHARP, label: 'Nítidas', preview: '2px' },
  { value: ThemeBorderRadius.DEFAULT, label: 'Padrão', preview: '8px' },
  { value: ThemeBorderRadius.ROUND, label: 'Arredondadas', preview: '18px' },
]

const OPTIONAL_HEX = z
  .string()
  .regex(HEX_REGEX, 'Cor inválida — use formato hex #RRGGBB')
  .optional()
  .or(z.literal(''))

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve ser kebab-case (ex: azul-clinico)')
    .optional()
    .or(z.literal('')),
  accentColor: z.string().regex(HEX_REGEX, 'Cor inválida — use formato hex #RRGGBB'),
  accentSoftColor: z.string().regex(HEX_REGEX, 'Cor inválida — use formato hex #RRGGBB'),
  bgColor: OPTIONAL_HEX,
  bgDarkColor: OPTIONAL_HEX,
  isDefault: z.boolean().optional(),
  borderRadius: z.nativeEnum(ThemeBorderRadius).optional(),
})

type FormValues = z.infer<typeof schema>

interface ThemeFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateThemeInput,
    setError: (field: string, error: { message: string }) => void,
  ) => void
}

interface ThemeFormEditProps {
  mode: 'edit'
  defaultValues: IThemeModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateThemeInput,
    setError: (field: string, error: { message: string }) => void,
  ) => void
}

type ThemeFormProps = ThemeFormCreateProps | ThemeFormEditProps

export function ThemeForm(props: ThemeFormProps) {
  const mode = props.mode
  const defaultValues = props.mode === 'edit' ? props.defaultValues : undefined
  const { isPending, globalError } = props

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === 'create'
      ? { accentColor: '#', accentSoftColor: '#', bgColor: '', bgDarkColor: '', isDefault: false, borderRadius: ThemeBorderRadius.DEFAULT }
      : undefined,
  })

  useEffect(() => {
    if (mode === 'edit' && defaultValues) {
      reset({
        name: defaultValues.name,
        accentColor: defaultValues.accentColor,
        accentSoftColor: defaultValues.accentSoftColor,
        bgColor: defaultValues.bgColor ?? '',
        bgDarkColor: defaultValues.bgDarkColor ?? '',
        isDefault: defaultValues.isDefault,
        borderRadius: defaultValues.borderRadius ?? ThemeBorderRadius.DEFAULT,
      })
    }
  }, [mode, defaultValues, reset])

  const accentColor = watch('accentColor')
  const accentSoftColor = watch('accentSoftColor')
  const bgColor = watch('bgColor')
  const bgDarkColor = watch('bgDarkColor')
  const selectedRadius = watch('borderRadius')
  const isValidHex = (v: string) => HEX_REGEX.test(v)

  function handleFormSubmit(data: FormValues) {
    const setErr = setError as (field: string, error: { message: string }) => void
    if (props.mode === 'create') {
      props.onSubmit(
        {
          name: data.name,
          accentColor: data.accentColor,
          accentSoftColor: data.accentSoftColor,
          isDefault: data.isDefault ?? false,
          borderRadius: data.borderRadius ?? ThemeBorderRadius.DEFAULT,
          ...(data.bgColor ? { bgColor: data.bgColor } : {}),
          ...(data.bgDarkColor ? { bgDarkColor: data.bgDarkColor } : {}),
          ...(data.slug ? { slug: data.slug } : {}),
        },
        setErr,
      )
    } else {
      props.onSubmit(
        {
          name: data.name,
          accentColor: data.accentColor,
          accentSoftColor: data.accentSoftColor,
          isDefault: data.isDefault ?? false,
          borderRadius: data.borderRadius ?? ThemeBorderRadius.DEFAULT,
          ...(data.bgColor ? { bgColor: data.bgColor } : {}),
          ...(data.bgDarkColor ? { bgDarkColor: data.bgDarkColor } : {}),
        },
        setErr,
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="theme-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="theme-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome"
          id="name"
          data-testid="theme-form-name"
          error={errors.name?.message}
          {...register('name')}
        />

        {mode === 'create' && (
          <Input
            label="Slug (opcional — gerado automaticamente se vazio)"
            id="slug"
            data-testid="theme-form-slug"
            placeholder="azul-clinico"
            error={errors.slug?.message}
            {...register('slug')}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="accentColor" className="text-sm font-medium text-text">
            Cor principal
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accentColor-picker"
              aria-hidden="true"
              value={isValidHex(accentColor) ? accentColor : '#000000'}
              onChange={(e) => setValue('accentColor', e.target.value, { shouldValidate: true })}
              className="h-10 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
            />
            <Input
              id="accentColor"
              data-testid="theme-form-accent-color"
              placeholder="#2563EB"
              error={errors.accentColor?.message}
              {...register('accentColor')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="accentSoftColor" className="text-sm font-medium text-text">
            Cor suave (fundo de elementos de destaque)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accentSoftColor-picker"
              aria-hidden="true"
              value={isValidHex(accentSoftColor) ? accentSoftColor : '#000000'}
              onChange={(e) => setValue('accentSoftColor', e.target.value, { shouldValidate: true })}
              className="h-10 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
            />
            <Input
              id="accentSoftColor"
              data-testid="theme-form-accent-soft-color"
              placeholder="#DBEAFE"
              error={errors.accentSoftColor?.message}
              {...register('accentSoftColor')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bgColor" className="text-sm font-medium text-text">
            Fundo light{' '}
            <span className="font-normal text-text-mute">(opcional — calculado automaticamente se vazio)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="bgColor-picker"
              aria-hidden="true"
              value={isValidHex(bgColor ?? '') ? bgColor! : '#F7F6F3'}
              onChange={(e) => setValue('bgColor', e.target.value, { shouldValidate: true })}
              className="h-10 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
            />
            <Input
              id="bgColor"
              data-testid="theme-form-bg-color"
              placeholder="#F7F6F3"
              error={errors.bgColor?.message}
              {...register('bgColor')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bgDarkColor" className="text-sm font-medium text-text">
            Fundo dark{' '}
            <span className="font-normal text-text-mute">(opcional — calculado automaticamente se vazio)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="bgDarkColor-picker"
              aria-hidden="true"
              value={isValidHex(bgDarkColor ?? '') ? bgDarkColor! : '#0B1220'}
              onChange={(e) => setValue('bgDarkColor', e.target.value, { shouldValidate: true })}
              className="h-10 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
            />
            <Input
              id="bgDarkColor"
              data-testid="theme-form-bg-dark-color"
              placeholder="#0B1220"
              error={errors.bgDarkColor?.message}
              {...register('bgDarkColor')}
            />
          </div>
        </div>

        {isValidHex(accentColor) && isValidHex(accentSoftColor) && (
          <div
            data-testid="theme-form-preview"
            className="rounded-md border border-line p-4"
            style={{ background: accentSoftColor }}
          >
            <span className="text-sm font-medium" style={{ color: accentColor }}>
              Preview — texto sobre fundo suave
            </span>
            <div
              className="mt-2 inline-flex items-center rounded px-3 py-1 text-sm font-medium text-white"
              style={{ background: accentColor }}
            >
              Botão de exemplo
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5" data-testid="theme-form-radius-selector">
          <label className="text-sm font-medium text-text">Bordas</label>
          <div className="grid grid-cols-3 gap-2">
            {RADIUS_OPTIONS.map(({ value, label, preview }) => (
              <button
                key={value}
                type="button"
                data-testid={`theme-form-radius-${value}`}
                onClick={() => setValue('borderRadius', value)}
                className={`flex flex-col items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                  selectedRadius === value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-text-mute hover:border-accent'
                }`}
              >
                <div
                  className="h-6 w-full bg-line"
                  style={{ borderRadius: preview }}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            data-testid="theme-form-is-default"
            className="h-4 w-4 rounded border-line accent-accent"
            {...register('isDefault')}
          />
          <span className="text-sm text-text">Tema padrão da plataforma</span>
        </label>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="theme-form-submit"
        >
          {isPending ? 'Salvando...' : mode === 'create' ? 'Criar tema' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
