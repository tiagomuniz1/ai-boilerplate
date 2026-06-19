'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { usePatients } from '@/components/features/patients/hooks/use-patients.hook'
import { useBookAppointment } from '../hooks/use-book-appointment.hook'
import type { IApiError } from '@/types/api.types'

const bookSchema = z.object({
  patientId: z.string().uuid('Selecione um paciente'),
  reason: z.string().max(500).optional().or(z.literal('')),
})

type BookFormValues = z.infer<typeof bookSchema>

interface BookAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  startTime: string
  endTime: string
  doctorId?: string
}

export function BookAppointmentDialog({
  isOpen,
  onClose,
  date,
  startTime,
  endTime,
  doctorId,
}: BookAppointmentDialogProps) {
  const { data: patientsData } = usePatients({ limit: 100 })
  const { mutate, isPending, isError, error, reset } = useBookAppointment()

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
  })

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      reset()
    }
  }, [isOpen, resetForm, reset])

  function onSubmit(values: BookFormValues) {
    mutate(
      {
        doctorId,
        patientId: values.patientId,
        date,
        startTime,
        reason: values.reason || undefined,
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  const apiError = error as IApiError | null
  const is409 = apiError?.status === 409
  const is422 = apiError?.status === 422

  const errorMessage = is409
    ? 'Este horário acabou de ser reservado. Por favor, escolha outro slot.'
    : is422
      ? 'Horário inválido ou no passado. Por favor, selecione outro horário.'
      : isError
        ? 'Ocorreu um erro ao agendar. Tente novamente.'
        : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar consulta"
      data-testid="book-appointment-dialog"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-4 text-sm bg-surface-2 rounded-md px-3 py-2">
          <div>
            <span className="text-text/50">Data</span>
            <p className="font-medium" data-testid="book-dialog-date">{date}</p>
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} data-testid="book-dialog-cancel">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending} data-testid="book-dialog-submit">
            Agendar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
