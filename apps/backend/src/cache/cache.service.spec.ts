const mockRedisInstance = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  disconnect: jest.fn(),
  scanStream: jest.fn(),
  pipeline: jest.fn(),
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

  describe('delByPrefix', () => {
    it('deletes all keys found by SCAN stream', async () => {
      const { EventEmitter } = require('events')
      const stream = new EventEmitter()
      const mockPipeline = { del: jest.fn(), exec: jest.fn().mockResolvedValue(null) }
      mockRedisInstance.scanStream.mockReturnValue(stream)
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline)

      const promise = service.delByPrefix('schedules:list:')
      stream.emit('data', ['schedules:list:a:b', 'schedules:list:c:d'])
      stream.emit('end')
      await promise

      expect(mockPipeline.del).toHaveBeenCalledWith('schedules:list:a:b')
      expect(mockPipeline.del).toHaveBeenCalledWith('schedules:list:c:d')
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('does not call pipeline.exec when no keys match', async () => {
      const { EventEmitter } = require('events')
      const stream = new EventEmitter()
      const mockPipeline = { del: jest.fn(), exec: jest.fn().mockResolvedValue(null) }
      mockRedisInstance.scanStream.mockReturnValue(stream)
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline)

      const promise = service.delByPrefix('nonexistent:')
      stream.emit('data', [])
      stream.emit('end')
      await promise

      expect(mockPipeline.del).not.toHaveBeenCalled()
      expect(mockPipeline.exec).not.toHaveBeenCalled()
    })

    it('rejects when stream emits an error', async () => {
      const { EventEmitter } = require('events')
      const stream = new EventEmitter()
      const mockPipeline = { del: jest.fn(), exec: jest.fn() }
      mockRedisInstance.scanStream.mockReturnValue(stream)
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline)

      const promise = service.delByPrefix('prefix:')
      stream.emit('error', new Error('SCAN error'))

      await expect(promise).rejects.toThrow('SCAN error')
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
