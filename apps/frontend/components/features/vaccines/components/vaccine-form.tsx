'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { Alert } from '@/components/ui/molecules/alert/alert'
import type { IVaccineModel } from '../types/vaccine-model.types'

// Limites espelhando o DTO: divergir aqui só adiaria o erro para o servidor.
const schema = z.object({
  name: z.string().min(2, 'Mínimo de 2 caracteres').max(120, 'Máximo de 120 caracteres'),
  abbreviation: z.string().max(20, 'Máximo de 20 caracteres').optional(),
  preventedDiseases: z.string().max(250, 'Máximo de 250 caracteres').optional(),
})

export type VaccineFormValues = z.infer<typeof schema>

interface VaccineFormProps {
  mode: 'create' | 'edit'
  initialData?: IVaccineModel
  isPending: boolean
  globalError: string | null
  onSubmit: (values: VaccineFormValues, setError: (field: keyof VaccineFormValues, error: { message: string }) => void) => void
}

export function VaccineForm({ mode, initialData, isPending, globalError, onSubmit }: VaccineFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VaccineFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      abbreviation: initialData?.abbreviation ?? '',
      preventedDiseases: initialData?.preventedDiseases ?? '',
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values, setError))}
      className="flex max-w-xl flex-col gap-4"
      data-testid="vaccine-form"
    >
      {globalError && (
        <Alert variant="error" data-testid="vaccine-form-error">
          {globalError}
        </Alert>
      )}

      <Input
        label="Nome"
        id="vaccine-name"
        placeholder="Tríplice viral"
        error={errors.name?.message}
        data-testid="vaccine-form-name"
        {...register('name')}
      />

      <Input
        label="Sigla (opcional)"
        id="vaccine-abbreviation"
        placeholder="SCR"
        error={errors.abbreviation?.message}
        data-testid="vaccine-form-abbreviation"
        {...register('abbreviation')}
      />

      <Input
        label="Doenças prevenidas (opcional)"
        id="vaccine-prevented"
        placeholder="sarampo, caxumba, rubéola"
        helperText="Texto livre — também serve à busca do profissional."
        error={errors.preventedDiseases?.message}
        data-testid="vaccine-form-prevented"
        {...register('preventedDiseases')}
      />

      <Button type="submit" variant="primary" disabled={isPending} data-testid="vaccine-form-submit">
        {isPending ? 'Salvando…' : mode === 'create' ? 'Criar vacina' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
