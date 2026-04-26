import fs from 'fs'
import path from 'path'
import { root } from './root'

export function writeFile(relativePath: string, content: string) {
    const fullPath = path.join(root, relativePath)

    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(fullPath, content)
}