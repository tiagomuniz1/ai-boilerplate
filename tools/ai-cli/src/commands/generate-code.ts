import path from 'path'
import { readFile } from '../utils/read-file'
import { writeFile } from '../utils/write-file'
import { slugify } from '../utils/slugify'

export function generateCode(taskPath: string) {
    if (!taskPath) {
        console.error('Você precisa informar o caminho da task')
        process.exit(1)
    }

    // const task = readFile(taskPath)
    const task = readFile(`tools/ai-cli/${taskPath}`)

    const finalPrompt = [
        'Você é um engenheiro de software sênior especialista na arquitetura deste projeto.',
        '',
        'Sua tarefa é implementar exatamente o que está descrito abaixo.',
        '',
        'Siga TODAS as regras e contexto definidos na task.',
        '',
        '---',
        '## INSTRUCTIONS',
        '- Não inventar padrões',
        '- Não ignorar regras',
        '- Não simplificar a solução',
        '- Código deve ser production-ready',
        '- Seguir estritamente a arquitetura definida',
        '- Se faltar informação, não inventar',
        '',
        '---',
        '## OUTPUT FORMAT',
        '- Retorne APENAS código',
        '- Não explique nada',
        '- Use cabeçalhos de arquivo:',
        '// caminho/do/arquivo.ts',
        '',
        '---',
        '## TASK',
        task
    ].join('\n')

    // extrair tipo e nome da task
    const parts = taskPath.split('/')
    const slug = parts[1]
    const type = parts[2].replace('task-', '').replace('.md', '') // backend | frontend

    const promptPath = `tasks/${slug}/prompt-${type}.md`

    writeFile(promptPath, finalPrompt)

    console.log(`\n✅ Prompt criado em: ${promptPath}\n`)
}