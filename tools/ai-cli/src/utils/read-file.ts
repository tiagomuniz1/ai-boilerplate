import fs from 'fs'
import path from 'path'
import { root } from './root'

export function readFile(relativePath: string) {
    const fullPath = path.join(root, relativePath)
    return fs.readFileSync(fullPath, 'utf-8')
}
