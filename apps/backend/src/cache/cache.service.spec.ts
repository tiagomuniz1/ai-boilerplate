const mockRedisInstance = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  disconnect: jest.fn(),
}

jest.mock('ioredis', () => {
  return { default: jest.fn(() => mockRedisInstance) }
})

import { CacheService } from './cache.service'

describe('CacheService', () => {
  let service: CacheService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CacheService()
  })

  describe('get', () => {
    it('returns parsed value when key exists', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 1 }))
      expect(await service.get('key')).toEqual({ data: 1 })
      expect(mockRedisInstance.get).toHaveBeenCalledWith('key')
    })

    it('returns null when key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null)
      expect(await service.get('missing')).toBeNull()
    })
  })

  describe('set', () => {
    it('serializes value and sets TTL', async () => {
      mockRedisInstance.set.mockResolvedValue('OK')
      await service.set('key', { x: 1 }, 60)
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', JSON.stringify({ x: 1 }), 'EX', 60)
    })
  })

  describe('del', () => {
    it('deletes key', async () => {
      mockRedisInstance.del.mockResolvedValue(1)
      await service.del('key')
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key')
    })
  })

  describe('setIfNotExists', () => {
    it('returns true when Redis returns OK', async () => {
      mockRedisInstance.set.mockResolvedValue('OK')
      expect(await service.setIfNotExists('key', '1', 10)).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', '1', 'EX', 10, 'NX')
    })

    it('returns false when Redis returns null (key already exists)', async () => {
      mockRedisInstance.set.mockResolvedValue(null)
      expect(await service.setIfNotExists('key', '1', 10)).toBe(false)
    })
  })

  describe('delByPattern', () => {
    it('deletes all keys matching the pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue(['users:list:1:20', 'users:list:2:20'])
      mockRedisInstance.del.mockResolvedValue(2)
      await service.delByPattern('users:list*')
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('users:list*')
      expect(mockRedisInstance.del).toHaveBeenCalledWith('users:list:1:20', 'users:list:2:20')
    })

    it('does not call del when no keys match', async () => {
      mockRedisInstance.keys.mockResolvedValue([])
      await service.delByPattern('users:list*')
      expect(mockRedisInstance.del).not.toHaveBeenCalled()
    })
  })

  describe('onModuleDestroy', () => {
    it('disconnects the Redis client', () => {
      service.onModuleDestroy()
      expect(mockRedisInstance.disconnect).toHaveBeenCalled()
    })
  })

  describe('error handler', () => {
    it('logs Redis connection errors via the on(error) callback', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation()
      const [, errorCallback] = mockRedisInstance.on.mock.calls.find(([event]) => event === 'error') ?? []
      expect(errorCallback).toBeDefined()
      errorCallback(new Error('connection refused'))
      expect(loggerSpy).toHaveBeenCalled()
      loggerSpy.mockRestore()
    })
  })
})
