import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { IApiError } from '@/types/api.types'

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

function getClinicSlug(): string | null {
  if (typeof window === 'undefined') return null
  const slug = (window.location.pathname ?? '').split('/').filter(Boolean)[0] ?? null
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
    }
  }
  return {
    status: 500,
    title: 'Internal Error',
    detail: error instanceof Error ? error.message : 'An unexpected error occurred',
  }
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
        const slug = getClinicSlug()
        const refreshOptions: { withCredentials: boolean; headers?: Record<string, string> } = { withCredentials: true }
        if (slug) refreshOptions.headers = { 'x-clinic-slug': slug }
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          refreshOptions,
        )
        return client(config)
      } catch {
        /* istanbul ignore else */
        if (typeof window !== 'undefined') {
          const slug = (window.location.pathname ?? '').split('/').filter(Boolean)[0] ?? 'backoffice'
          window.location.href = `/${slug}/login`
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
}
