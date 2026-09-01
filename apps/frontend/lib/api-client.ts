import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { IApiError } from '@/types/api.types'
import { extractSlugFromSubdomain, isSubdomainMode } from '@/lib/subdomain'

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

function getClinicSlug(): string | null {
  /* c8 ignore next */
  if (typeof window === 'undefined') return null
  // Subdomain-mode (prod): the slug is in the hostname (clinica-a.pulso.center),
  // NOT the path — the visible path has no slug. Path-mode (dev): fall back to
  // the first path segment (/clinica-a/...). backoffice → null (generic cookie).
  const slug =
    extractSlugFromSubdomain(window.location.hostname) ??
    /* c8 ignore next */
    ((window.location.pathname ?? '').split('/').filter(Boolean)[0] ?? null)
  return slug && slug !== 'backoffice' ? slug : null
}

client.interceptors.request.use((config) => {
  const slug = getClinicSlug()
  if (slug) config.headers['x-clinic-slug'] = slug
  return config
})

function normalizeProblemDetails(error: unknown): IApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<IApiError>
    return {
      status: data.status ?? error.response.status,
      title: data.title ?? 'Error',
      detail: data.detail ?? error.message,
      errors: data.errors,
      requiresCaptcha: data.requiresCaptcha,
    }
  }
  return {
    status: 500,
    title: 'Internal Error',
    detail: error instanceof Error ? error.message : 'An unexpected error occurred',
  }
}

// Um único refresh por vez, compartilhado por todas as requisições que tomaram
// 401 juntas.
//
// O backend rotaciona o refresh token: emitir um novo revoga o anterior
// (refresh-token.use-case.ts:80). Uma tela que dispara várias queries de uma vez
// — o dashboard faz isso — tinha todas expirando no mesmo instante, e cada uma
// chamava /auth/refresh por conta própria. A primeira revogava o token que as
// outras estavam usando; as perdedoras tomavam 401 e mandavam o usuário para o
// login, no meio de uma sessão perfeitamente válida.
let inFlightRefresh: Promise<void> | null = null

function refreshSession(): Promise<void> {
  if (inFlightRefresh) return inFlightRefresh

  const slug = getClinicSlug()
  const refreshOptions: { withCredentials: boolean; headers?: Record<string, string> } = { withCredentials: true }
  if (slug) refreshOptions.headers = { 'x-clinic-slug': slug }

  inFlightRefresh = axios
    .post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {}, refreshOptions)
    .then(() => undefined)
    .finally(() => {
      inFlightRefresh = null
    })

  return inFlightRefresh
}

client.interceptors.response.use(
  (response) => response.data,
  async (error: unknown) => {
    const requestUrl = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh')

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      !(error.config as RetryableConfig)?._retry
    ) {
      const config = error.config as RetryableConfig
      config._retry = true
      try {
        await refreshSession()
        return client(config)
      } catch {
        /* c8 ignore else */
        if (typeof window !== 'undefined') {
          // Subdomain-mode: login lives at /login on the current subdomain (matches
          // the middleware). Path-mode: /<slug>/login.
          if (isSubdomainMode()) {
            window.location.href = '/login'
          } else {
            /* c8 ignore next */
            const slug = (window.location.pathname ?? '').split('/').filter(Boolean)[0] ?? 'backoffice'
            window.location.href = `/${slug}/login`
          }
        }
      }
    }
    return Promise.reject(normalizeProblemDetails(error))
  },
)

export const apiClient = {
  get: <T>(url: string): Promise<T> => client.get<never, T>(url),
  post: <T>(url: string, data?: unknown): Promise<T> => client.post<never, T>(url, data),
  put: <T>(url: string, data?: unknown): Promise<T> => client.put<never, T>(url, data),
  patch: <T>(url: string, data?: unknown): Promise<T> => client.patch<never, T>(url, data),
  delete: <T>(url: string): Promise<T> => client.delete<never, T>(url),
  getBlob: (url: string): Promise<Blob> => client.get<never, Blob>(url, { responseType: 'blob' }),
}
