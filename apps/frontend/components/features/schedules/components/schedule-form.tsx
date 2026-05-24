'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DayOfWeek, UserRole } from '@app/shared'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { cn } from '@/lib/cn'
import { DAY_OF_WEEK_LABELS } from '../types/schedule-model.types'
import type { ICreateScheduleInput, IUpdateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function applyTimeMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const baseFields = {
  dayOfWeek: z.nativeEnum(DayOfWeek, { required_error: 'Dia da semana obrigatório' }),
  startTime: z.string().regex(timeRegex, 'Horário inválido. Use HH:MM'),
  endTime: z.string().regex(timeRegex, 'Horário inválido. Use HH:MM'),
  slotDurationInMinutes: z
    .number({ invalid_type_error: 'Duração inválida' })
    .int()
    .min(15, 'Mínimo 15 minutos')
    .max(120, 'Máximo 120 minutos'),
  validFrom: z.string().regex(dateRegex).optional().or(z.literal('')),
  validUntil: z.string().regex(dateRegex).optional().or(z.literal('')),
}

function refineSchedule(
  data: { startTime: string; endTime: string; slotDurationInMinutes: number; validFrom?: string; validUntil?: string },
  ctx: z.RefinementCtx,
) {
  if (timeRegex.test(data.startTime) && timeRegex.test(data.endTime)) {
    if (timeToMinutes(data.startTime) >= timeToMinutes(data.endTime)) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Horário de fim deve ser após o início' })
    }
    const interval = timeToMinutes(data.endTime) - timeToMinutes(data.startTime)
    if (interval > 0 && data.slotDurationInMinutes > 0 && interval % data.slotDurationInMinutes !== 0) {
      ctx.addIssue({ code: 'custom', path: ['slotDurationInMinutes'], message: 'O intervalo de tempo deve ser divisível pela duração do slot' })
    }
  }
  if (data.validFrom && data.validUntil && data.validFrom >= data.validUntil) {
    ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'Data final deve ser após a data inicial' })
  }
}

const createSchemaDoctor = z.object(baseFields).superRefine(refineSchedule)

const createSchemaAdmin = z
  .object({ ...baseFields, doctorId: z.string().uuid('Selecione um médico') })
  .superRefine(refineSchedule)

type CreateFormDoctorValues = z.infer<typeof createSchemaDoctor>
type CreateFormAdminValues = z.infer<typeof createSchemaAdmin>

interface ScheduleFormCreateProps {
  mode: 'create'
  role: UserRole
  doctors?: Array<{ id: string; user: { fullName: string } }>
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: ICreateScheduleInput,
    setError: (field: string, error: { message: string }) => void,
  ) => void
}

interface ScheduleFormEditProps {
  mode: 'edit'
  defaultValues: IScheduleModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (
    data: IUpdateScheduleInput,
    setError: (field: string, error: { message: string }) => void,
  ) => void
}

export type ScheduleFormProps = ScheduleFormCreateProps | ScheduleFormEditProps

export function ScheduleForm(props: ScheduleFormProps) {
  if (props.mode === 'create') {
    return <ScheduleFormCreate {...props} />
  }
  return <ScheduleFormEdit {...props} />
}

function ScheduleFormCreate({ role, doctors, isPending, globalError, onSubmit }: ScheduleFormCreateProps) {
  const isAdmin = role === UserRole.ADMIN
  const schema = isAdmin ? createSchemaAdmin : createSchemaDoctor

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateFormAdminValues>({
    resolver: zodResolver(schema),
    defaultValues: { slotDurationInMinutes: 30 },
  })

  function handleFormSubmit(data: CreateFormAdminValues) {
    const input: ICreateScheduleInput = {
      ...(isAdmin ? { doctorId: data.doctorId } : {}),
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDurationInMinutes: data.slotDurationInMinutes,
      validFrom: data.validFrom || undefined,
      validUntil: data.validUntil || undefined,
    }
    onSubmit(input, setError as (field: string, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="schedule-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="schedule-form-error">
            {globalError}
          </Alert>
        )}

        {isAdmin && (
          <SelectField
            id="doctorId"
            label="Médico"
            testId="schedule-form-doctor"
            error={(errors as Record<string, { message?: string }>).doctorId?.message}
            registerProps={register('doctorId')}
          >
            <option value="">— Selecione —</option>
            {(doctors ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.fullName}
              </option>
            ))}
          </SelectField>
        )}

        <SelectField
          id="dayOfWeek"
          label="Dia da semana"
          testId="schedule-form-day"
          error={errors.dayOfWeek?.message}
          registerProps={register('dayOfWeek')}
        >
          <option value="">— Selecione —</option>
          {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input
                label="Início"
                id="startTime"
                placeholder="08:00"
                maxLength={5}
                data-testid="schedule-form-start-time"
                error={errors.startTime?.message}
                {...field}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input
                label="Fim"
                id="endTime"
                placeholder="12:00"
                maxLength={5}
                data-testid="schedule-form-end-time"
                error={errors.endTime?.message}
                {...field}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
        </div>

        <Controller
          name="slotDurationInMinutes"
          control={control}
          render={({ field }) => (
            <Input
              label="Duração da consulta (min)"
              id="slotDurationInMinutes"
              type="number"
              min={15}
              max={120}
              data-testid="schedule-form-slot"
              error={errors.slotDurationInMinutes?.message}
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              value={String(field.value ?? '')}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Válido de"
            id="validFrom"
            type="date"
            data-testid="schedule-form-valid-from"
            error={errors.validFrom?.message}
            {...register('validFrom')}
          />
          <Input
            label="Válido até"
            id="validUntil"
            type="date"
            data-testid="schedule-form-valid-until"
            error={errors.validUntil?.message}
            {...register('validUntil')}
          />
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="schedule-form-submit"
        >
          {isPending ? 'Salvando...' : 'Criar agenda'}
        </Button>
      </div>
    </form>
  )
}

function ScheduleFormEdit({ defaultValues, isPending, globalError, onSubmit }: ScheduleFormEditProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateFormDoctorValues>({
    resolver: zodResolver(createSchemaDoctor),
  })

  useEffect(() => {
    reset({
      dayOfWeek: defaultValues.dayOfWeek,
      startTime: defaultValues.startTime,
      endTime: defaultValues.endTime,
      slotDurationInMinutes: defaultValues.slotDurationInMinutes,
      validFrom: defaultValues.validFrom ?? '',
      validUntil: defaultValues.validUntil ?? '',
    })
  }, [defaultValues, reset])

  function handleFormSubmit(data: CreateFormDoctorValues) {
    const input: IUpdateScheduleInput = {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDurationInMinutes: data.slotDurationInMinutes,
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
    }
    onSubmit(input, setError as (field: string, error: { message: string }) => void)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="schedule-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="schedule-form-error">
            {globalError}
          </Alert>
        )}

        <SelectField
          id="dayOfWeek"
          label="Dia da semana"
          testId="schedule-form-day"
          error={errors.dayOfWeek?.message}
          registerProps={register('dayOfWeek')}
        >
          <option value="">— Selecione —</option>
          {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input
                label="Início"
                id="startTime"
                placeholder="08:00"
                maxLength={5}
                data-testid="schedule-form-start-time"
                error={errors.startTime?.message}
                {...field}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input
                label="Fim"
                id="endTime"
                placeholder="12:00"
                maxLength={5}
                data-testid="schedule-form-end-time"
                error={errors.endTime?.message}
                {...field}
                onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
              />
            )}
          />
        </div>

        <Controller
          name="slotDurationInMinutes"
          control={control}
          render={({ field }) => (
            <Input
              label="Duração da consulta (min)"
              id="slotDurationInMinutes"
              type="number"
              min={15}
              max={120}
              data-testid="schedule-form-slot"
              error={errors.slotDurationInMinutes?.message}
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              value={String(field.value ?? '')}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Válido de"
            id="validFrom"
            type="date"
            data-testid="schedule-form-valid-from"
            error={errors.validFrom?.message}
            {...register('validFrom')}
          />
          <Input
            label="Válido até"
            id="validUntil"
            type="date"
            data-testid="schedule-form-valid-until"
            error={errors.validUntil?.message}
            {...register('validUntil')}
          />
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="schedule-form-submit"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

function SelectField({
  id,
  label,
  testId,
  error,
  registerProps,
  children,
}: {
  id: string
  label: string
  testId: string
  error?: string
  registerProps: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-10 w-full rounded-md px-3 text-base',
          'bg-surface border border-line text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
        data-testid={testId}
        {...registerProps}
      >
        {children}
      </select>
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
