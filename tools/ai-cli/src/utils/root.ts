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

export const root = findRootDir()
