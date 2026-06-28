import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import {
  ANVISA_MEDICATIONS_URL,
  importAnvisaMedications,
} from './medications/import-anvisa-medications'

interface CliArgs {
  filePath?: string
  url?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--file') args.filePath = argv[(i += 1)]
    else if (arg.startsWith('--file=')) args.filePath = arg.slice('--file='.length)
    else if (arg === '--url') args.url = argv[(i += 1)]
    else if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length)
  }
  return args
}

async function run(): Promise<void> {
  const { filePath, url } = parseArgs(process.argv.slice(2))
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  try {
    const source = filePath ? `file ${filePath}` : url ?? ANVISA_MEDICATIONS_URL
    console.log(`[run-import-medications] Importing medications from ${source}`)

    const result = await importAnvisaMedications(dataSource, {
      filePath,
      url,
      logger: (message) => console.log(message),
    })

    console.log(
      `[run-import-medications] Completed. read=${result.read} imported=${result.imported} ` +
        `skipped=${result.skipped} batches=${result.batches}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-import-medications] Failed:', err)
    process.exit(1)
  })
