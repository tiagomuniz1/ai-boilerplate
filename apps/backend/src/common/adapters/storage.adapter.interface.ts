export abstract class IStorageAdapter {
  abstract upload(buffer: Buffer, path: string, mimeType: string): Promise<string>
}
