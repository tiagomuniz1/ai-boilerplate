#!/usr/bin/env node

import dotenv from 'dotenv'
import path from 'path'
import { root } from './utils/root'

dotenv.config({ path: path.join(root, '.env') })

import { generateTask } from './commands/generate-task'
import { generateCode } from './commands/generate-code'

const [, , command, ...args] = process.argv

async function main() {
    switch (command) {
        case 'generate:task': {
            const type =
                args[0] === 'frontend' || args[0] === 'backend'
                    ? args[0]
                    : 'backend'

            const input =
                type === args[0]
                    ? args.slice(1).join(' ')
                    : args.join(' ')

            await generateTask(input, type)
            break
        }

        case 'generate:code': {
            const taskPath = args[0]

            if (!taskPath) {
                console.error('Você precisa informar o caminho da task')
                process.exit(1)
            }

            await generateCode(taskPath)
            break
        }

        default:
            console.log(`
Available commands:

- generate:task "<descrição>"
- generate:task frontend "<descrição>"
- generate:code <caminho-da-task>

Examples:

yarn ai generate:task "Criar login"
yarn ai generate:task frontend "Criar tela de login"
yarn ai generate:code tasks/backend/criar-login.md
`)
    }
}

main()