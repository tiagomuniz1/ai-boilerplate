'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserRole } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useCreateScheduleException } from '../hooks/use-create-schedule-exception.hook'
import type { IApiError } from '@/types/api.types'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const blockSchema = z
  .object({
    date: z.string().min(1, 'Data obrigatória'),
    allDay: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    reason: z.string().max(500).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (!data.allDay) {
      if (!data.startTime || !timeRegex.test(data.startTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Horário inicial obrigatório (HH:MM)', path: ['startTime'] })
      }
      if (!data.endTime || !timeRegex.test(data.endTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Horário final obrigatório (HH:MM)', path: ['endTime'] })
      }
      if (data.startTime && data.endTime && timeRegex.test(data.startTime) && timeRegex.test(data.endTime)) {
        if (data.startTime >= data.endTime) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Horário final deve ser após o horário inicial', path: ['endTime'] })
        }
      }
    }
  })

type BlockFormValues = z.infer<typeof blockSchema>

interface BlockTimeDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  role: UserRole
  doctorId?: string
}

export function BlockTimeDialog({ isOpen, onClose, date, role, doctorId }: BlockTimeDialogProps) {
  const { mutate, isPending, isError, error, reset: resetMutation } = useCreateScheduleException()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset: resetForm,
    setError,
    formState: { errors },
  } = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: { date, allDay: false },
  })

  const allDay = watch('allDay')

  useEffect(() => {
    if (isOpen) {
      resetForm({ date, allDay: false, startTime: '', endTime: '', reason: '' })
      resetMutation()
    }
  }, [isOpen, date, resetForm, resetMutation])

  function onSubmit(values: BlockFormValues) {
    const input = {
      doctorId: role === UserRole.ADMIN ? doctorId : undefined,
      date: values.date,
      /* c8 ignore next 2 */
      startTime: values.allDay ? null : values.startTime || null,
      endTime: values.allDay ? null : values.endTime || null,
      reason: values.reason || null,
    }

    mutate(input, {
      onSuccess: () => {
        onClose()
      },
      onError: (err) => {
        if (err.status === 422 && err.errors) {
          err.errors.forEach(({ field, message }) => {
            setError(field as keyof BlockFormValues, { message })
          })
        }
      },
    })
  }

  const apiError = error as IApiError | null
  const is409 = apiError?.status === 409

  const conflictMessage = is409
    ? apiError?.detail || 'Existe consulta agendada nesse período. Remarque ou cancele a consulta antes de bloquear o horário.'
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bloquear horário" data-testid="block-time-dialog">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="block-date" className="block text-sm font-medium mb-1">
            Data <span className="text-danger">*</span>
          </label>
          <input
            id="block-date"
            type="date"
            data-testid="block-dialog-date"
            {...register('date')}
            aria-invalid={!!errors.date}
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.date && (
            <p className="text-danger text-xs mt-1" data-testid="block-dialog-date-error">
              {errors.date.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="allDay"
            control={control}
            render={({ field }) => (
              <input
                id="block-all-day"
                type="checkbox"
                data-testid="block-dialog-all-day"
                checked={field.value}
                onChange={field.onChange}
                className="h-4 w-4 rounded border-line text-accent"
              />
            )}
          />
          <label htmlFor="block-all-day" className="text-sm font-medium">
            Dia inteiro
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="block-start-time" className="block text-sm font-medium mb-1">
              Início
            </label>
            <input
              id="block-start-time"
              type="time"
              data-testid="block-dialog-start-time"
              {...register('startTime')}
              disabled={allDay}
              aria-invalid={!!errors.startTime}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40"
            />
            {errors.startTime && (
              <p className="text-danger text-xs mt-1" data-testid="block-dialog-start-time-error">
                {errors.startTime.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="block-end-time" className="block text-sm font-medium mb-1">
              Fim
            </label>
            <input
              id="block-end-time"
              type="time"
              data-testid="block-dialog-end-time"
              {...register('endTime')}
              disabled={allDay}
              aria-invalid={!!errors.endTime}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40"
            />
            {errors.endTime && (
              <p className="text-danger text-xs mt-1" data-testid="block-dialog-end-time-error">
                {errors.endTime.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="block-reason" className="block text-sm font-medium mb-1">
            Motivo (opcional)
          </label>
          <textarea
            id="block-reason"
            data-testid="block-dialog-reason"
            {...register('reason')}
            rows={3}
            maxLength={500}
            placeholder="Ex: Congresso médico, consulta particular..."
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {conflictMessage && (
          <Alert variant="error" data-testid="block-dialog-conflict-error">
            {conflictMessage}
          </Alert>
        )}

        {isError && !is409 && (
          <Alert variant="error" data-testid="block-dialog-error">
            Ocorreu um erro ao bloquear o horário. Tente novamente.
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} data-testid="block-dialog-cancel">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending} data-testid="block-dialog-submit">
            Bloquear
          </Button>
        </div>
      </form>
    </Modal>
  )
}
