'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicationSource } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import type { IMedicationModel } from '../types/medication-model.types'
import type { ICreateMedicationInput, IUpdateMedicationInput } from '../types/medication-input.types'

const SOURCE_LABELS: Record<MedicationSource, string> = {
  [MedicationSource.ANVISA]: 'ANVISA',
  [MedicationSource.MANUAL]: 'Manual',
}

const schema = z.object({
  name: z
    .string()
    .min(2, 'Deve ter no mínimo 2 caracteres')
    .max(250, 'Deve ter no máximo 250 caracteres'),
  activeIngredient: z.string().max(500, 'Deve ter no máximo 500 caracteres').optional(),
  regulatoryCategory: z.string().max(120, 'Deve ter no máximo 120 caracteres').optional(),
  therapeuticClass: z.string().max(250, 'Deve ter no máximo 250 caracteres').optional(),
  holderCompany: z.string().max(250, 'Deve ter no máximo 250 caracteres').optional(),
  registrationNumber: z.string().max(40, 'Deve ter no máximo 40 caracteres').optional(),
  registrationStatus: z.string().max(40, 'Deve ter no máximo 40 caracteres').optional(),
  isActive: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

function getMsg(err: unknown): string | undefined {
  return (err as { message?: string } | undefined)?.message
}

interface MedicationFormCreateProps {
  mode: 'create'
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateMedicationInput,
    setError: (field: keyof ICreateMedicationInput, error: { message: string }) => void,
  ) => void
}

interface MedicationFormEditProps {
  mode: 'edit'
  defaultValues: IMedicationModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateMedicationInput,
    setError: (field: keyof IUpdateMedicationInput, error: { message: string }) => void,
  ) => void
}

type MedicationFormProps = MedicationFormCreateProps | MedicationFormEditProps

export function MedicationForm(props: MedicationFormProps) {
  const isEdit = props.mode === 'edit'

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  })

  useEffect(() => {
    if (props.mode === 'edit') {
      reset({
        name: props.defaultValues.name,
        activeIngredient: props.defaultValues.activeIngredient ?? '',
        regulatoryCategory: props.defaultValues.regulatoryCategory ?? '',
        therapeuticClass: props.defaultValues.therapeuticClass ?? '',
        holderCompany: props.defaultValues.holderCompany ?? '',
        registrationNumber: props.defaultValues.registrationNumber ?? '',
        registrationStatus: props.defaultValues.registrationStatus ?? '',
        isActive: props.defaultValues.isActive,
      })
    }
  }, [props, reset])

  function handleFormSubmit(data: FormValues) {
    if (props.mode === 'create') {
      const input: ICreateMedicationInput = {
        name: data.name,
        ...(data.activeIngredient ? { activeIngredient: data.activeIngredient } : {}),
        ...(data.regulatoryCategory ? { regulatoryCategory: data.regulatoryCategory } : {}),
        ...(data.therapeuticClass ? { therapeuticClass: data.therapeuticClass } : {}),
        ...(data.holderCompany ? { holderCompany: data.holderCompany } : {}),
        ...(data.registrationNumber ? { registrationNumber: data.registrationNumber } : {}),
        ...(data.registrationStatus ? { registrationStatus: data.registrationStatus } : {}),
      }
      props.onSubmit(input, setError as never)
      return
    }

    const input: IUpdateMedicationInput = {
      name: data.name,
      activeIngredient: data.activeIngredient || undefined,
      regulatoryCategory: data.regulatoryCategory || undefined,
      therapeuticClass: data.therapeuticClass || undefined,
      holderCompany: data.holderCompany || undefined,
      registrationNumber: data.registrationNumber || undefined,
      registrationStatus: data.registrationStatus || undefined,
      isActive: data.isActive,
    }
    props.onSubmit(input, setError as never)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="medication-form" noValidate>
      <div className="flex flex-col gap-4">
        {props.globalError && (
          <Alert variant="error" data-testid="medication-form-error">
            {props.globalError}
          </Alert>
        )}

        {isEdit && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">Origem</label>
            <p
              className="px-3 py-2 rounded-md border border-line bg-surface-2 text-sm text-text-dim"
              data-testid="medication-form-source-readonly"
            >
              {SOURCE_LABELS[(props as MedicationFormEditProps).defaultValues.source]}
            </p>
          </div>
        )}

        <Input
          label="Nome"
          id="name"
          placeholder="ex: Dipirona Sódica 500mg"
          error={getMsg(errors.name)}
          data-testid="medication-form-name"
          {...register('name')}
        />

        <Input
          label="Princípio ativo"
          id="activeIngredient"
          placeholder="ex: dipirona sódica"
          error={getMsg(errors.activeIngredient)}
          data-testid="medication-form-active-ingredient"
          {...register('activeIngredient')}
        />

        <Input
          label="Classe terapêutica"
          id="therapeuticClass"
          placeholder="ex: Analgésicos"
          error={getMsg(errors.therapeuticClass)}
          data-testid="medication-form-therapeutic-class"
          {...register('therapeuticClass')}
        />

        <Input
          label="Categoria regulatória"
          id="regulatoryCategory"
          placeholder="ex: Genérico"
          error={getMsg(errors.regulatoryCategory)}
          data-testid="medication-form-regulatory-category"
          {...register('regulatoryCategory')}
        />

        <Input
          label="Empresa detentora do registro"
          id="holderCompany"
          error={getMsg(errors.holderCompany)}
          data-testid="medication-form-holder-company"
          {...register('holderCompany')}
        />

        <Input
          label="Número de registro"
          id="registrationNumber"
          error={getMsg(errors.registrationNumber)}
          data-testid="medication-form-registration-number"
          {...register('registrationNumber')}
        />

        <Input
          label="Situação do registro"
          id="registrationStatus"
          placeholder="ex: Ativo"
          error={getMsg(errors.registrationStatus)}
          data-testid="medication-form-registration-status"
          {...register('registrationStatus')}
        />

        {isEdit && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 rounded border-line text-accent"
              data-testid="medication-form-is-active"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-sm text-text-dim cursor-pointer">
              Medicamento ativo
            </label>
          </div>
        )}

        <Button
          type="submit"
          isLoading={props.isPending}
          disabled={props.isPending}
          data-testid="medication-form-submit"
        >
          {props.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar medicamento'}
        </Button>
      </div>
    </form>
  )
}
