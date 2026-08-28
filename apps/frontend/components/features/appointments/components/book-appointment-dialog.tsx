'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MAXIMUM_RECURRENCE_HORIZON_IN_DAYS,
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
  RECURRENCE_INTERVAL_IN_WEEKS,
  RecurrenceInterval,
} from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { usePatients } from '@/components/features/patients/hooks/use-patients.hook'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { useBookAppointment } from '../hooks/use-book-appointment.hook'
import { useBookRecurringAppointments } from '../hooks/use-book-recurring-appointments.hook'
import { useRecurrencePreview } from '../hooks/use-recurrence-preview.hook'
import type { IApiError } from '@/types/api.types'
import { formatDateToBR } from '@/lib/format-date'
import { RecurrenceFields } from './recurrence-fields'
import { RecurrencePreviewList } from './recurrence-preview-list'
import type { IBookFormValues } from '../types/book-form.types'
import type { IRecurrencePreviewInput } from '../types/appointment-input.types'

/**
 * Built once per specialtyCount rather than inline on every render, so the
 * resolver identity is stable while the user types.
 */
function makeBookSchema(specialtyCount: number) {
  return z
    .object({
      patientId: z.string().uuid('Selecione um paciente'),
      reason: z.string().max(500).optional().or(z.literal('')),
      specialtyId:
        specialtyCount > 1
          ? z.string().uuid('Selecione uma especialidade')
          : z.string().optional().or(z.literal('')),
      isRecurring: z.boolean(),
      recurrenceInterval: z.nativeEnum(RecurrenceInterval),
      endMode: z.enum(['occurrences', 'until']),
      occurrenceCount: z.string(),
      untilDate: z.string(),
    })
    .superRefine((values, ctx) => {
      if (!values.isRecurring) return

      if (values.endMode === 'occurrences') {
        const parsed = Number(values.occurrenceCount)
        if (
          !Number.isInteger(parsed) ||
          parsed < MINIMUM_RECURRING_OCCURRENCES ||
          parsed > MAXIMUM_RECURRING_OCCURRENCES
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['occurrenceCount'],
            message: `Informe entre ${MINIMUM_RECURRING_OCCURRENCES} e ${MAXIMUM_RECURRING_OCCURRENCES} consultas`,
          })
        }
        return
      }

      if (!values.untilDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['untilDate'],
          message: 'Informe a data final',
        })
      }
    })
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

interface BookAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  startTime: string
  endTime: string
  professionalId?: string
}

export function BookAppointmentDialog({
  isOpen,
  onClose,
  date,
  startTime,
  endTime,
  professionalId,
}: BookAppointmentDialogProps) {
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: doctor, isPending: isDoctorLoading } = useProfessional(professionalId ?? '', {
    enabled: isOpen && !!professionalId,
  })
  const { mutate, isPending, isError, error, reset } = useBookAppointment()
  const {
    mutate: bookRecurring,
    isPending: isBookingRecurring,
    error: recurringError,
    reset: resetRecurring,
  } = useBookRecurringAppointments()

  const [step, setStep] = useState<1 | 2>(1)
  const [previewParams, setPreviewParams] = useState<IRecurrencePreviewInput | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useRecurrencePreview(step === 2 ? previewParams : null)

  const occurrences = preview?.occurrences ?? []
  const specialties = doctor?.specialties ?? []
  const specialtyCount = specialties.length
  const doctorLoaded = !isDoctorLoading && !!professionalId

  const bookSchema = useMemo(() => makeBookSchema(specialtyCount), [specialtyCount])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset: resetForm,
    formState: { errors },
  } = useForm<IBookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      patientId: '',
      reason: '',
      specialtyId: '',
      isRecurring: false,
      recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
      endMode: 'occurrences',
      occurrenceCount: '4',
      untilDate: '',
    },
  })

  const isRecurring = watch('isRecurring')
  const endMode = watch('endMode')
  const recurrenceInterval = watch('recurrenceInterval')

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      reset()
      resetRecurring()
      setStep(1)
      setPreviewParams(null)
      setSelectedDates([])
    }
  }, [isOpen, resetForm, reset, resetRecurring])

  useEffect(() => {
    if (specialties.length === 1) {
      setValue('specialtyId', specialties[0].id)
    } else if (specialties.length !== 1) {
      setValue('specialtyId', '')
    }
  }, [specialties, setValue])

  // Every available date starts ticked; re-entering step 2 with unchanged params
  // reuses the cached object, so the user's unticks survive going back and forth.
  useEffect(() => {
    if (preview) {
      setSelectedDates(preview.occurrences.filter((o) => o.selectable).map((o) => o.date))
    }
  }, [preview])

  const selectableDates = occurrences.filter((o) => o.selectable).map((o) => o.date)

  function onSubmit(values: IBookFormValues) {
    if (!values.isRecurring) {
      mutate(
        {
          professionalId,
          patientId: values.patientId,
          date,
          startTime,
          reason: values.reason || undefined,
          /* c8 ignore next */
          specialtyId: values.specialtyId || undefined,
        },
        { onSuccess: () => onClose() },
      )
      return
    }

    setPreviewParams({
      professionalId,
      patientId: values.patientId,
      date,
      startTime,
      recurrenceInterval: values.recurrenceInterval,
      occurrenceCount:
        values.endMode === 'occurrences' ? Number(values.occurrenceCount) : undefined,
      untilDate: values.endMode === 'until' ? values.untilDate : undefined,
    })
    setStep(2)
  }

  function handleConfirmRecurrence() {
    const values = getValues()
    bookRecurring(
      {
        professionalId,
        specialtyId: values.specialtyId || undefined,
        patientId: values.patientId,
        startTime,
        recurrenceInterval: values.recurrenceInterval,
        dates: selectedDates,
        occurrenceCount:
          values.endMode === 'occurrences' ? Number(values.occurrenceCount) : undefined,
        untilDate: values.endMode === 'until' ? values.untilDate : undefined,
        reason: values.reason || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  function toggleDate(toggled: string) {
    setSelectedDates((current) =>
      current.includes(toggled) ? current.filter((d) => d !== toggled) : [...current, toggled],
    )
  }

  function toggleAllDates() {
    setSelectedDates((current) => (current.length === selectableDates.length ? [] : selectableDates))
  }

  const apiError = error as IApiError | null
  const is409 = apiError?.status === 409
  const is422 = apiError?.status === 422
  const is422Specialty =
    is422 &&
    (apiError?.detail?.toLowerCase().includes('especialidade') ||
      apiError?.detail?.toLowerCase().includes('specialty'))

  const errorMessage = is409
    ? 'Este horário acabou de ser reservado. Por favor, escolha outro slot.'
    : is422Specialty
      ? 'Especialidade inválida ou não pertence ao profissional.'
      : is422
        ? 'Horário inválido ou no passado. Por favor, selecione outro horário.'
        : isError
          ? 'Ocorreu um erro ao agendar. Tente novamente.'
          : null

  const recurringApiError = recurringError as (IApiError & { conflictingOccurrences?: unknown[] }) | null
  const conflictingDates = (recurringApiError?.conflictingOccurrences ?? []) as Array<{ date: string }>
  const recurringErrorMessage =
    recurringApiError?.status === 409
      ? conflictingDates.length > 0
        ? `Estas datas deixaram de estar disponíveis: ${conflictingDates.map((o) => formatDateToBR(o.date)).join(', ')}. Revise a lista e tente novamente.`
        : 'Algumas datas deixaram de estar disponíveis. Revise a lista e tente novamente.'
      : recurringApiError?.status === 422
        ? 'A configuração de recorrência é inválida. Revise as datas e tente novamente.'
        : recurringApiError
          ? 'Ocorreu um erro ao agendar a série. Tente novamente.'
          : null

  const isSubmitBlocked = isPending || isDoctorLoading

  const intervalInWeeks = RECURRENCE_INTERVAL_IN_WEEKS[recurrenceInterval]
  const minUntilDate = addDays(date, 7 * intervalInWeeks)
  const maxUntilDate = addDays(date, MAXIMUM_RECURRENCE_HORIZON_IN_DAYS)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Agendar consulta' : 'Revisar datas'}
      data-testid="book-appointment-dialog"
    >
      {step === 1 ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-4 text-sm bg-surface-2 rounded-md px-3 py-2">
            <div>
              <span className="text-text/50">Data</span>
              <p className="font-medium" data-testid="book-dialog-date">{formatDateToBR(date)}</p>
            </div>
            <div>
              <span className="text-text/50">Horário</span>
              <p className="font-medium" data-testid="book-dialog-time">
                {startTime} – {endTime}
              </p>
            </div>
          </div>

          {errorMessage && (
            <Alert variant="error" data-testid="book-dialog-error">
              {errorMessage}
            </Alert>
          )}

          <div>
            <label htmlFor="patientId" className="block text-sm font-medium mb-1">
              Paciente <span className="text-danger">*</span>
            </label>
            <select
              id="patientId"
              data-testid="book-dialog-patient"
              {...register('patientId')}
              aria-invalid={!!errors.patientId}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Selecione um paciente</option>
              {patientsData?.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="text-danger text-xs mt-1" data-testid="book-dialog-patient-error">
                {errors.patientId.message}
              </p>
            )}
          </div>

          {doctorLoaded && specialtyCount === 1 && (
            <div data-testid="book-dialog-specialty-readonly">
              <span className="block text-sm font-medium mb-1">Especialidade</span>
              <p className="text-sm text-text/70 bg-surface-2 rounded-md px-3 py-2">
                {specialties[0].name}
              </p>
            </div>
          )}

          {doctorLoaded && specialtyCount > 1 && (
            <div>
              <label htmlFor="specialtyId" className="block text-sm font-medium mb-1">
                Especialidade <span className="text-danger">*</span>
              </label>
              <select
                id="specialtyId"
                data-testid="book-dialog-specialty"
                {...register('specialtyId')}
                aria-invalid={!!errors.specialtyId}
                className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Selecione a especialidade</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.specialtyId && (
                <p className="text-danger text-xs mt-1" data-testid="book-dialog-specialty-error">
                  {errors.specialtyId.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-1">
              Motivo (opcional)
            </label>
            <textarea
              id="reason"
              data-testid="book-dialog-reason"
              {...register('reason')}
              rows={3}
              maxLength={500}
              placeholder="Descreva o motivo da consulta..."
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <RecurrenceFields
            register={register}
            errors={errors}
            isRecurring={isRecurring}
            endMode={endMode}
            date={date}
            startTime={startTime}
            minUntilDate={minUntilDate}
            maxUntilDate={maxUntilDate}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} data-testid="book-dialog-cancel">
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isSubmitBlocked} data-testid="book-dialog-submit">
              {isRecurring ? 'Revisar datas' : 'Agendar'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4" data-testid="book-dialog-recurrence-step">
          {recurringErrorMessage && (
            <Alert variant="error" data-testid="recurrence-submit-error">
              {recurringErrorMessage}
            </Alert>
          )}

          <RecurrencePreviewList
            preview={preview}
            isLoading={isPreviewLoading}
            isError={isPreviewError}
            onRetry={() => refetchPreview()}
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            onToggleAll={toggleAllDates}
          />

          <div className="sticky bottom-0 flex justify-end gap-2 bg-surface-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={isBookingRecurring}
              data-testid="book-dialog-recurrence-back"
            >
              Voltar
            </Button>
            {!isPreviewLoading && !isPreviewError && occurrences.length > 0 && (
              <Button
                type="button"
                onClick={handleConfirmRecurrence}
                isLoading={isBookingRecurring}
                disabled={selectedDates.length === 0}
                data-testid="book-dialog-recurrence-confirm"
              >
                Agendar {selectedDates.length} consultas
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
