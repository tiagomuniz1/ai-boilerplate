import path from 'path'
import { readFile } from '../utils/read-file'
import { writeFile } from '../utils/write-file'

export function generateCode(taskPath: string) {
    if (!taskPath) {
        console.error('Você precisa informar o caminho da task')
        process.exit(1)
    }

    const task = readFile(taskPath)

    const basename = path.basename(taskPath, '.md')
    const type = basename.replace('task-', '')
    const slug = path.basename(path.dirname(taskPath))

    if (type !== 'backend' && type !== 'frontend') {
        console.error(`Tipo inválido: "${type}". O arquivo deve se chamar task-backend.md ou task-frontend.md`)
        process.exit(1)
    }

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

    const promptPath = `tasks/${slug}/prompt-${type}.md`

    writeFile(promptPath, finalPrompt)

    console.log(`\n✅ Prompt criado em: ${promptPath}\n`)
}