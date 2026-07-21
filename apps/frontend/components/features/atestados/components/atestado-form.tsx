'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicalCertificateType } from '@app/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { ProfessionalSignatureSelect } from '@/components/features/professionals/components/professional-signature-select'
import type { ICreateAtestadoInput } from '../types/atestado-input.types'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

function applyTimeMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

const schema = z
  .object({
    type: z.nativeEnum(MedicalCertificateType),
    // Constraints for daysOff/startDate/attendanceDate/checkInTime/checkOutTime are enforced
    // in superRefine (not here) — these fields unmount when the other type is selected, and a
    // number field's leftover "" value would coerce to 0 and fail a chained .min(1) even when
    // the field is hidden and irrelevant to the currently selected type.
    daysOff: z.coerce.number().optional(),
    startDate: z.string().optional(),
    cidCode: z.string().max(20, 'Máximo 20 caracteres').optional(),
    attendanceDate: z.string().optional(),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    observations: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === MedicalCertificateType.LEAVE) {
      if (!data.daysOff || !Number.isInteger(data.daysOff) || data.daysOff < 1 || data.daysOff > 365) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['daysOff'], message: 'Informe um número de dias entre 1 e 365' })
      }
      if (!data.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Data obrigatória' })
      }
    } else {
      if (!data.attendanceDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attendanceDate'], message: 'Data obrigatória' })
      }
      if (!data.checkInTime || !TIME_REGEX.test(data.checkInTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkInTime'], message: 'Formato HH:MM' })
      }
      if (!data.checkOutTime || !TIME_REGEX.test(data.checkOutTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkOutTime'], message: 'Formato HH:MM' })
      }
    }
  })

type FormValues = z.infer<typeof schema>

export interface AtestadoFormProps {
  appointmentId: string
  professionalId: string
  isPending: boolean
  globalError: string | null
  onSubmit: (input: ICreateAtestadoInput) => void
}

export function AtestadoForm({ appointmentId, professionalId, isPending, globalError, onSubmit }: AtestadoFormProps) {
  const [crmId, setCrmId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: MedicalCertificateType.LEAVE,
      startDate: '',
      cidCode: '',
      attendanceDate: '',
      checkInTime: '',
      checkOutTime: '',
      observations: '',
    },
  })

  const type = watch('type')
  const isLeave = type === MedicalCertificateType.LEAVE

  function onFormSubmit(values: FormValues) {
    onSubmit({
      appointmentId,
      ...(crmId ? { crmId } : {}),
      ...(specialtyId ? { specialtyId } : {}),
      type: values.type,
      ...(values.type === MedicalCertificateType.LEAVE
        ? {
            daysOff: values.daysOff,
            startDate: values.startDate,
            ...(values.cidCode ? { cidCode: values.cidCode } : {}),
          }
        : {
            attendanceDate: values.attendanceDate,
            checkInTime: values.checkInTime,
            checkOutTime: values.checkOutTime,
          }),
      ...(values.observations ? { observations: values.observations } : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} data-testid="atestado-form" className="flex flex-col gap-5">
      <div className="flex gap-1" data-testid="atestado-form-type-tabs">
        <button
          type="button"
          onClick={() => setValue('type', MedicalCertificateType.LEAVE, { shouldValidate: true })}
          className={`px-3 py-1 text-xs rounded border ${isLeave ? 'bg-accent text-white border-accent' : 'border-border text-text-mute hover:bg-accent/10'}`}
          data-testid="atestado-form-type-leave"
        >
          Afastamento
        </button>
        <button
          type="button"
          onClick={() => setValue('type', MedicalCertificateType.ATTENDANCE, { shouldValidate: true })}
          className={`px-3 py-1 text-xs rounded border ${!isLeave ? 'bg-accent text-white border-accent' : 'border-border text-text-mute hover:bg-accent/10'}`}
          data-testid="atestado-form-type-attendance"
        >
          Comparecimento
        </button>
      </div>

      {isLeave ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor="atestado-days-off"
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Dias de afastamento
              </label>
              <input
                {...register('daysOff')}
                id="atestado-days-off"
                type="number"
                min={1}
                max={365}
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                data-testid="atestado-form-days-off"
              />
              {errors.daysOff && (
                <p role="alert" className="text-danger text-xs mt-0.5">{errors.daysOff.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="atestado-start-date"
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Data de início
              </label>
              <input
                {...register('startDate')}
                id="atestado-start-date"
                type="date"
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                data-testid="atestado-form-start-date"
              />
              {errors.startDate && (
                <p role="alert" className="text-danger text-xs mt-0.5">{errors.startDate.message}</p>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="atestado-cid-code"
              className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
            >
              CID (opcional)
            </label>
            <input
              {...register('cidCode')}
              id="atestado-cid-code"
              type="text"
              placeholder="Ex: M54.5"
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              data-testid="atestado-form-cid-code"
            />
            {errors.cidCode && (
              <p role="alert" className="text-danger text-xs mt-0.5">{errors.cidCode.message}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="atestado-attendance-date"
              className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
            >
              Data da consulta
            </label>
            <input
              {...register('attendanceDate')}
              id="atestado-attendance-date"
              type="date"
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              data-testid="atestado-form-attendance-date"
            />
            {errors.attendanceDate && (
              <p role="alert" className="text-danger text-xs mt-0.5">{errors.attendanceDate.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor="atestado-check-in-time"
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Entrada
              </label>
              <Controller
                control={control}
                name="checkInTime"
                render={({ field }) => (
                  <input
                    {...field}
                    id="atestado-check-in-time"
                    type="text"
                    placeholder="08:00"
                    maxLength={5}
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    data-testid="atestado-form-check-in-time"
                    onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
                  />
                )}
              />
              {errors.checkInTime && (
                <p role="alert" className="text-danger text-xs mt-0.5">{errors.checkInTime.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="atestado-check-out-time"
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Saída
              </label>
              <Controller
                control={control}
                name="checkOutTime"
                render={({ field }) => (
                  <input
                    {...field}
                    id="atestado-check-out-time"
                    type="text"
                    placeholder="08:30"
                    maxLength={5}
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    data-testid="atestado-form-check-out-time"
                    onChange={(e) => field.onChange(applyTimeMask(e.target.value))}
                  />
                )}
              />
              {errors.checkOutTime && (
                <p role="alert" className="text-danger text-xs mt-0.5">{errors.checkOutTime.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="atestado-observations"
          className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
        >
          Observações (opcional)
        </label>
        <textarea
          {...register('observations')}
          id="atestado-observations"
          rows={3}
          className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Observações adicionais..."
          data-testid="atestado-form-observations"
        />
        {errors.observations && (
          <p role="alert" className="text-danger text-xs mt-0.5">{errors.observations.message}</p>
        )}
      </div>

      <ProfessionalSignatureSelect
        professionalId={professionalId}
        registrationId={crmId}
        specialtyId={specialtyId}
        onRegistrationIdChange={setCrmId}
        onSpecialtyIdChange={setSpecialtyId}
      />

      {globalError && (
        <Alert variant="error" data-testid="atestado-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="atestado-form-submit"
        >
          Emitir atestado
        </Button>
      </div>
    </form>
  )
}
