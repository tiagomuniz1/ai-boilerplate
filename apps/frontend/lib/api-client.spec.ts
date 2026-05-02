jest.mock('axios', () => {
  const interceptorUse = jest.fn()
  const instance = Object.assign(jest.fn(), {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { response: { use: interceptorUse } },
  })
  return {
    create: jest.fn().mockReturnValue(instance),
    isAxiosError: jest.fn(),
    post: jest.fn(),
  }
})

import axios from 'axios'
import { apiClient } from './api-client'

describe('api-client', () => {
  let axiosInstance: any
  let onFulfilled: (response: any) => any
  let onRejected: (error: unknown) => Promise<any>

  beforeAll(() => {
    axiosInstance = (axios.create as jest.Mock).mock.results[0].value
    const [fulfilled, rejected] = (axiosInstance.interceptors.response.use as jest.Mock).mock.calls[0]
    onFulfilled = fulfilled
    onRejected = rejected
  })

  beforeEach(() => {
    jest.resetAllMocks()
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      configurable: true,
      writable: true,
    })
  })

  describe('response interceptor — success handler', () => {
    it('unwraps response.data', () => {
      expect(onFulfilled({ data: { id: 1, name: 'Alice' } })).toEqual({ id: 1, name: 'Alice' })
    })
  })

  describe('normalizeProblemDetails', () => {
    it('returns full problem details when axios error has complete data', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
      const error = {
        response: {
          status: 422,
          data: {
            status: 422,
            title: 'Unprocessable Entity',
            detail: 'Validation failed',
            errors: [{ field: 'email', message: 'Invalid email' }],
          },
        },
        config: { _retry: true },
        message: 'Request failed with status 422',
      }

      await expect(onRejected(error)).rejects.toEqual({
        status: 422,
        title: 'Unprocessable Entity',
        detail: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }],
      })
    })

    it('uses fallback values when data fields are absent', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
      const error = {
        response: { status: 503, data: {} },
        config: { _retry: true },
        message: 'Service Unavailable',
      }

      await expect(onRejected(error)).rejects.toEqual({
        status: 503,
        title: 'Error',
        detail: 'Service Unavailable',
        errors: undefined,
      })
    })

    it('falls through to the non-axios branch when response.data is falsy', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
      const error = {
        response: { status: 503, data: null },
        config: { _retry: true },
        message: 'Service Unavailable',
      }

      await expect(onRejected(error)).rejects.toMatchObject({ status: 500, title: 'Internal Error' })
    })

    it('returns 500 with error.message for non-axios Error instances', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(false)

      await expect(onRejected(new Error('Network failure'))).rejects.toEqual({
        status: 500,
        title: 'Internal Error',
        detail: 'Network failure',
      })
    })

    it('returns "An unexpected error occurred" for non-Error thrown values', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(false)

      await expect(onRejected('raw string')).rejects.toEqual({
        status: 500,
        title: 'Internal Error',
        detail: 'An unexpected error occurred',
      })
    })
  })

  describe('401 retry logic', () => {
    it('retries the original request after successful token refresh', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
      ;(axios.post as jest.Mock).mockResolvedValue({})
      const retried = { id: 1 }
      axiosInstance.mockResolvedValue(retried)

      const error = {
        response: { status: 401, data: {} },
        config: { _retry: false, url: '/protected' },
        message: 'Unauthorized',
      }

      const result = await onRejected(error)

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        {},
        { withCredentials: true },
      )
      expect(axiosInstance).toHaveBeenCalledWith(expect.objectContaining({ _retry: true }))
      expect(result).toBe(retried)
    })

    it('redirects to /login and rejects when refresh fails', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
      ;(axios.post as jest.Mock).mockRejectedValue(new Error('Refresh failed'))

      const error = {
        response: { status: 401, data: {} },
        config: { _retry: false },
        message: 'Unauthorized',
      }

      await expect(onRejected(error)).rejects.toBeDefined()
      expect(window.location.href).toBe('/login')
    })

    it('skips retry when request is already marked as retried', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)

      const error = {
        response: {
          status: 401,
          data: { status: 401, title: 'Unauthorized', detail: 'Token expired' },
        },
        config: { _retry: true },
        message: 'Unauthorized',
      }

      await expect(onRejected(error)).rejects.toBeDefined()
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('normalizes non-401 axios errors without retrying', async () => {
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)

      const error = {
        response: {
          status: 500,
          data: { status: 500, title: 'Server Error', detail: 'Something went wrong' },
        },
        config: {},
        message: 'Internal Server Error',
      }

      await expect(onRejected(error)).rejects.toMatchObject({ status: 500 })
      expect(axios.post).not.toHaveBeenCalled()
    })
  })

  describe('apiClient methods', () => {
    it('get delegates to client.get', async () => {
      axiosInstance.get.mockResolvedValue([{ id: 1 }])
      const result = await apiClient.get('/users')
      expect(axiosInstance.get).toHaveBeenCalledWith('/users')
      expect(result).toEqual([{ id: 1 }])
    })

    it('post delegates to client.post', async () => {
      axiosInstance.post.mockResolvedValue({ id: 2 })
      const result = await apiClient.post('/users', { name: 'Alice' })
      expect(axiosInstance.post).toHaveBeenCalledWith('/users', { name: 'Alice' })
      expect(result).toEqual({ id: 2 })
    })

    it('put delegates to client.put', async () => {
      axiosInstance.put.mockResolvedValue({ id: 3 })
      const result = await apiClient.put('/users/1', { name: 'Bob' })
      expect(axiosInstance.put).toHaveBeenCalledWith('/users/1', { name: 'Bob' })
      expect(result).toEqual({ id: 3 })
    })

    it('patch delegates to client.patch', async () => {
      axiosInstance.patch.mockResolvedValue({ id: 4 })
      const result = await apiClient.patch('/users/1', { name: 'Carol' })
      expect(axiosInstance.patch).toHaveBeenCalledWith('/users/1', { name: 'Carol' })
      expect(result).toEqual({ id: 4 })
    })

    it('delete delegates to client.delete', async () => {
      axiosInstance.delete.mockResolvedValue(undefined)
      await apiClient.delete('/users/1')
      expect(axiosInstance.delete).toHaveBeenCalledWith('/users/1')
    })
  })
})
