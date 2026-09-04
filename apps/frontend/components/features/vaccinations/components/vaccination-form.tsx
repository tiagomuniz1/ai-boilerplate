'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useVaccines } from '@/components/features/vaccines/hooks/use-vaccines.hook'
import type { ICreateVaccinationInput } from '../types/vaccination-input.types'

const hoje = new Date().toISOString().slice(0, 10)

const schema = z.object({
  vaccineId: z.string().min(1, 'Escolha a vacina'),
  doseLabel: z.string().min(1, 'Informe a dose').max(40, 'Máximo de 40 caracteres'),
  appliedAt: z
    .string()
    .min(1, 'Informe a data')
    .refine((value) => value <= hoje, 'A data não pode ser futura'),
  appliedAtOurClinic: z.boolean().optional(),
  appliedAtDescription: z.string().max(160, 'Máximo de 160 caracteres').optional(),
  lotNumber: z.string().max(80, 'Máximo de 80 caracteres').optional(),
  manufacturer: z.string().max(80, 'Máximo de 80 caracteres').optional(),
  notes: z.string().max(1000, 'Máximo de 1000 caracteres').optional(),
})

type FormValues = z.infer<typeof schema>

interface VaccinationFormProps {
  patientId: string
  appointmentId?: string
  isPending: boolean
  globalError: string | null
  onSubmit: (input: ICreateVaccinationInput) => void
}

export function VaccinationForm({
  patientId,
  appointmentId,
  isPending,
  globalError,
  onSubmit,
}: VaccinationFormProps) {
  // Dezenas de vacinas: um select resolve. A busca com lista de resultados de
  // `prescription-form` existe porque lá são 36 mil medicamentos — e dispara
  // uma consulta por tecla.
  const { data: vaccines, isPending: isLoadingVaccines } = useVaccines({ limit: 100 })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { appliedAtOurClinic: false },
  })

  const naNossaClinica = watch('appliedAtOurClinic')

  function submit(values: FormValues) {
    onSubmit({
      patientId,
      appointmentId,
      vaccineId: values.vaccineId,
      doseLabel: values.doseLabel,
      appliedAt: values.appliedAt,
      appliedAtOurClinic: values.appliedAtOurClinic ?? false,
      appliedAtDescription: values.appliedAtDescription || undefined,
      lotNumber: values.lotNumber || undefined,
      manufacturer: values.manufacturer || undefined,
      notes: values.notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" data-testid="vaccination-form">
      {globalError && (
        <Alert variant="error" data-testid="vaccination-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vaccination-vaccine" className="text-sm text-text-dim">
          Vacina
        </label>
        <select
          id="vaccination-vaccine"
          {...register('vaccineId')}
          disabled={isLoadingVaccines}
          data-testid="vaccination-form-vaccine"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">{isLoadingVaccines ? 'Carregando…' : 'Selecione'}</option>
          {vaccines?.data.map((vaccine) => (
            <option key={vaccine.id} value={vaccine.id}>
              {vaccine.abbreviation ? `${vaccine.abbreviation} — ${vaccine.name}` : vaccine.name}
            </option>
          ))}
        </select>
        {errors.vaccineId && (
          <span className="text-xs text-danger" data-testid="vaccination-form-vaccine-error">
            {errors.vaccineId.message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Dose"
          id="vaccination-dose"
          placeholder="1ª dose, reforço…"
          error={errors.doseLabel?.message}
          data-testid="vaccination-form-dose"
          {...register('doseLabel')}
        />
        <Input
          label="Data de aplicação"
          id="vaccination-applied-at"
          type="date"
          max={hoje}
          error={errors.appliedAt?.message}
          data-testid="vaccination-form-applied-at"
          {...register('appliedAt')}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-dim">
        <input
          type="checkbox"
          {...register('appliedAtOurClinic')}
          data-testid="vaccination-form-our-clinic"
        />
        Aplicada nesta clínica
      </label>

      {/* Só faz sentido perguntar onde foi quando não foi aqui. */}
      {!naNossaClinica && (
        <Input
          label="Onde foi aplicada"
          id="vaccination-where"
          placeholder="UBS Centro, clínica de imunização…"
          error={errors.appliedAtDescription?.message}
          data-testid="vaccination-form-where"
          {...register('appliedAtDescription')}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Lote (opcional)"
          id="vaccination-lot"
          error={errors.lotNumber?.message}
          data-testid="vaccination-form-lot"
          {...register('lotNumber')}
        />
        <Input
          label="Fabricante (opcional)"
          id="vaccination-manufacturer"
          error={errors.manufacturer?.message}
          data-testid="vaccination-form-manufacturer"
          {...register('manufacturer')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vaccination-notes" className="text-sm text-text-dim">
          Observações (opcional)
        </label>
        <textarea
          id="vaccination-notes"
          rows={3}
          {...register('notes')}
          data-testid="vaccination-form-notes"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
        />
      </div>

      <Button type="submit" variant="primary" disabled={isPending} data-testid="vaccination-form-submit">
        {isPending ? 'Salvando…' : 'Registrar dose'}
      </Button>
    </form>
  )
}
