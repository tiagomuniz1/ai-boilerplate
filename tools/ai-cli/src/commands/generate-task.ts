import Anthropic from '@anthropic-ai/sdk'
import { readFile } from '../utils/read-file'
import { writeFile } from '../utils/write-file'
import { slugify } from '../utils/slugify'

export async function generateTask(
    input: string,
    type: 'backend' | 'frontend' = 'backend'
) {
    if (!input) {
        console.error('Você precisa informar a descrição da task')
        process.exit(1)
    }

    const architecture = readFile('ai/context/architecture.md')
    const typeContext = readFile(`ai/context/${type}.md`)
    const templatePath = type === 'backend' ? 'ai/task-backend.md' : 'ai/task-frontend.md'
    const template = readFile(templatePath)

    const systemPrompt = [
        'Você é um engenheiro de software sênior.',
        '',
        'Preencha o template de task abaixo com base no INPUT fornecido.',
        'Siga estritamente os contextos de arquitetura definidos.',
        'Retorne APENAS o template preenchido, sem explicações adicionais.',
        '',
        '---',
        '## CONTEXT — ARQUITETURA',
        architecture,
        '',
        '---',
        `## CONTEXT — ${type.toUpperCase()}`,
        typeContext,
    ].join('\n')

    const userPrompt = [
        '## TEMPLATE',
        template,
        '',
        '---',
        '## INPUT',
        input,
    ].join('\n')

    console.log('\n⏳ Gerando task com Claude...\n')

    const client = new Anthropic()

    const stream = client.messages.stream({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: [
            {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' },
            },
        ],
        messages: [{ role: 'user', content: userPrompt }],
    })

    let responseText = ''

    for await (const event of stream) {
        if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
        ) {
            process.stdout.write(event.delta.text)
            responseText += event.delta.text
        }
    }

    console.log('\n')

    const slug = slugify(input)
    const filePath = `tasks/${slug}/task-${type}.md`

    writeFile(filePath, responseText)

    console.log(`\n✅ Task criada em: ${filePath}\n`)
}
