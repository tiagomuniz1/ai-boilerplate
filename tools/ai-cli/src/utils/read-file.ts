import fs from 'fs'
import path from 'path'

function findRootDir(): string {
    let dir = process.cwd()

    while (true) {
        const pkgPath = path.join(dir, 'package.json')

        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

            if (pkg.workspaces) {
                return dir
            }
        }

        const parent = path.dirname(dir)
        if (parent === dir) break

        dir = parent
    }

    throw new Error('Monorepo root not found')
}

const root = findRootDir()

export function readFile(relativePath: string) {
    const fullPath = path.join(root, relativePath)
    return fs.readFileSync(fullPath, 'utf-8')
}
