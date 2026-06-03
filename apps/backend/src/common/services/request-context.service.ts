import { AsyncLocalStorage } from 'async_hooks'

interface RequestContext {
  requestId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export class RequestContextService {
  static run<T>(context: RequestContext, callback: () => T): T {
    return storage.run(context, callback)
  }

  static get requestId(): string | undefined {
    return storage.getStore()?.requestId
  }
}
