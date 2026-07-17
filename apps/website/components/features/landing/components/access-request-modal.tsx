'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'
import { accessRequestsService } from '../services/access-requests.service'

type Status = 'idle' | 'submitting' | 'success' | 'error'

/** Modal form behind every "Solicitar acesso" CTA — the platform is closed to self-service signups. */
export function AccessRequestModal() {
  const isOpen = useAccessRequestModalStore((s) => s.isOpen)
  const close = useAccessRequestModalStore((s) => s.close)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!isOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  useEffect(() => {
    if (isOpen) setStatus('idle')
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone') ?? '').trim()

    setStatus('submitting')
    try {
      await accessRequestsService.create({
        fullName: String(form.get('fullName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        clinicName: String(form.get('clinicName') ?? '').trim(),
        ...(phone ? { phone } : {}),
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/60 p-4"
      onClick={close}
      data-testid="access-request-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-request-title"
        className="w-full max-w-md rounded-2xl bg-content-bg p-8 text-content-text shadow-hero"
        onClick={(event) => event.stopPropagation()}
        data-testid="access-request-modal"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="access-request-title" className="text-4xl font-bold">
            Solicitar acesso
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            data-testid="access-request-close"
            className="text-content-mute transition-colors hover:text-content-text"
          >
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div data-testid="access-request-success">
            <p className="mb-6 text-content-mute">
              Recebemos sua solicitação. Nossa equipe vai avaliar e entrar em contato pelo e-mail
              informado.
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-lg bg-wine px-7 py-4 text-md font-bold text-white transition-colors hover:bg-wine-hover"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} data-testid="access-request-form" className="space-y-4">
            <p className="mb-2 text-content-mute">
              A plataforma não permite cadastros abertos. Preencha os dados abaixo e entraremos em
              contato para liberar o acesso.
            </p>

            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-semibold">
                Nome completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                disabled={status === 'submitting'}
                className="w-full rounded-lg border border-soft-gray bg-content-card px-4 py-2.5 text-content-text outline-none focus:border-terracotta"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={status === 'submitting'}
                className="w-full rounded-lg border border-soft-gray bg-content-card px-4 py-2.5 text-content-text outline-none focus:border-terracotta"
              />
            </div>

            <div>
              <label htmlFor="clinicName" className="mb-1 block text-sm font-semibold">
                Nome da clínica
              </label>
              <input
                id="clinicName"
                name="clinicName"
                type="text"
                required
                disabled={status === 'submitting'}
                className="w-full rounded-lg border border-soft-gray bg-content-card px-4 py-2.5 text-content-text outline-none focus:border-terracotta"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-semibold">
                Telefone <span className="font-normal text-content-mute">(opcional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                disabled={status === 'submitting'}
                className="w-full rounded-lg border border-soft-gray bg-content-card px-4 py-2.5 text-content-text outline-none focus:border-terracotta"
              />
            </div>

            {status === 'error' && (
              <p data-testid="access-request-error" className="text-sm text-wine">
                Não foi possível enviar sua solicitação. Tente novamente em instantes.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full rounded-lg bg-terracotta px-7 py-4 text-md font-bold text-white transition-colors hover:bg-terracotta-hover disabled:opacity-60"
            >
              {status === 'submitting' ? 'Enviando…' : 'Solicitar acesso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
