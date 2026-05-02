import { DataSource, QueryRunner } from 'typeorm'
import { BaseUseCase } from './base.use-case'

class TestUseCase extends BaseUseCase {
  async executeWithTransaction<T>(op: (qr: QueryRunner) => Promise<T>): Promise<T> {
    return this.runInTransaction(op)
  }
}

function makeQueryRunner(): jest.Mocked<QueryRunner> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<QueryRunner>
}

describe('BaseUseCase', () => {
  let queryRunner: jest.Mocked<QueryRunner>
  let dataSource: jest.Mocked<DataSource>
  let useCase: TestUseCase

  beforeEach(() => {
    queryRunner = makeQueryRunner()
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>
    useCase = new TestUseCase(dataSource)
  })

  it('commits transaction on success', async () => {
    const operation = jest.fn().mockResolvedValue('value')

    const result = await useCase.executeWithTransaction(operation)

    expect(queryRunner.connect).toHaveBeenCalled()
    expect(queryRunner.startTransaction).toHaveBeenCalled()
    expect(operation).toHaveBeenCalledWith(queryRunner)
    expect(queryRunner.commitTransaction).toHaveBeenCalled()
    expect(queryRunner.release).toHaveBeenCalled()
    expect(result).toBe('value')
  })

  it('rolls back and rethrows on error', async () => {
    const error = new Error('operation failed')
    const operation = jest.fn().mockRejectedValue(error)

    await expect(useCase.executeWithTransaction(operation)).rejects.toThrow('operation failed')

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled()
    expect(queryRunner.release).toHaveBeenCalled()
  })

  it('always releases the queryRunner', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('fail'))

    await expect(useCase.executeWithTransaction(operation)).rejects.toThrow()

    expect(queryRunner.release).toHaveBeenCalled()
  })
})
