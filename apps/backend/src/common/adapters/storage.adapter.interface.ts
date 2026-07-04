export abstract class IStorageAdapter {
  abstract upload(buffer: Buffer, path: string, mimeType: string, isPublic: boolean): Promise<string>
  abstract download(path: string): Promise<Buffer>
}
