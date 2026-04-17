import { readFile } from '../utils/read-file'
import { writeFile } from '../utils/write-file'
import { slugify } from '../utils/slugify'

export function generateTask(
    input: string,
    type: 'backend' | 'frontend' = 'backend'
) {
    if (!input) {
        console.error('Você precisa informar a descrição da task')
        process.exit(1)
    }

    const context = readFile('ai/context.md')
    const rules = readFile('ai/rules.md')

    const templatePath =
        type === 'backend'
            ? 'ai/task-backend.md'
            : 'ai/task-frontend.md'

    const template = readFile(templatePath)

    const finalPrompt = [
        'Você é um engenheiro de software sênior.',
        '',
        'Siga estritamente o contexto e as regras.',
        '',
        '---',
        '## CONTEXT',
        context,
        '',
        '---',
        '## RULES',
        rules,
        '',
        '---',
        '## TEMPLATE',
        template,
        '',
        '---',
        '## INPUT',
        input
    ].join('\n')

    const slug = slugify(input)
    const filePath = `tasks/${slug}/task-${type}.md`

    writeFile(filePath, finalPrompt)

    console.log(`\n✅ Task criada em: ${filePath}\n`)
}