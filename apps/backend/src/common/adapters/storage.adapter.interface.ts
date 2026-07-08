export abstract class IStorageAdapter {
  // Every object is stored privately. `upload` returns the object key/path; retrieval always goes
  // through `download()` (e.g. the backend streams clinic branding and exam results).
  abstract upload(buffer: Buffer, path: string, mimeType: string): Promise<string>
  abstract download(path: string): Promise<Buffer>
}
