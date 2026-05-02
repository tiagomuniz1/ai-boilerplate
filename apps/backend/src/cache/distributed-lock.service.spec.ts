import { ConflictException } from '@nestjs/common'
import { DistributedLockService } from './distributed-lock.service'
import { CacheService } from './cache.service'

const mockCacheService: jest.Mocked<Pick<CacheService, 'setIfNotExists' | 'del'>> = {
  setIfNotExists: jest.fn(),
  del: jest.fn(),
}

describe('DistributedLockService', () => {
  let service: DistributedLockService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DistributedLockService(mockCacheService as unknown as CacheService)
  })

  it('runs operation when lock is acquired', async () => {
    mockCacheService.setIfNotExists.mockResolvedValue(true)
    mockCacheService.del.mockResolvedValue(undefined)
    const operation = jest.fn().mockResolvedValue('result')

    const result = await service.runWithLock('product:1', 10, operation)

    expect(mockCacheService.setIfNotExists).toHaveBeenCalledWith('lock:product:1', '1', 10)
    expect(operation).toHaveBeenCalled()
    expect(result).toBe('result')
  })

  it('releases lock after successful operation', async () => {
    mockCacheService.setIfNotExists.mockResolvedValue(true)
    mockCacheService.del.mockResolvedValue(undefined)

    await service.runWithLock('product:1', 10, () => Promise.resolve('ok'))

    expect(mockCacheService.del).toHaveBeenCalledWith('lock:product:1')
  })

  it('releases lock even when operation throws', async () => {
    mockCacheService.setIfNotExists.mockResolvedValue(true)
    mockCacheService.del.mockResolvedValue(undefined)
    const operation = jest.fn().mockRejectedValue(new Error('fail'))

    await expect(service.runWithLock('product:1', 10, operation)).rejects.toThrow('fail')

    expect(mockCacheService.del).toHaveBeenCalledWith('lock:product:1')
  })

  it('throws ConflictException when lock cannot be acquired', async () => {
    mockCacheService.setIfNotExists.mockResolvedValue(false)

    await expect(
      service.runWithLock('product:1', 10, () => Promise.resolve('ok')),
    ).rejects.toThrow(ConflictException)

    expect(mockCacheService.del).not.toHaveBeenCalled()
  })
})
