// Config do bundle com webpack. NÃO é o caminho de build do projeto: `build` e
// `build:docker` compilam com tsc (nest-cli.build.json), que é o que produção
// roda. Este arquivo só entra em jogo se alguém passar `nest build --webpack`.
//
// Antes de tentar isso, saiba o que falta: `database.config.ts` resolve entities
// e migrations por glob de sistema de arquivos
// (`path.join(__dirname, '../**/*.entity{.ts,.js}')`). O webpack junta tudo num
// main.js só, então o glob não acha `.entity.js` nenhum no dist — acha os 32
// `.entity.ts` do código-fonte, e o TypeORM morre tentando dar require em
// TypeScript. O bundle sobe o Nest e falha na conexão com o banco.
//
// Fazer o bundle funcionar exige trocar os globs por imports explícitos de cada
// entity e migration. Ninguém precisa disso hoje: produção usa o build com tsc.

const fs = require('fs')
const path = require('path')
const nodeExternals = require('webpack-node-externals')

// Yarn workspaces iça as dependências para o node_modules da RAIZ do monorepo —
// o de apps/backend tem uma dúzia de pacotes, contra mais de mil na raiz.
//
// `nodeExternals()` sem argumento lê `node_modules` relativo ao cwd, que aqui é
// apps/backend, e `readDir` devolve `[]` em silêncio quando não encontra o que
// procura. O resultado não era um erro: era um build que empacotava quase tudo
// e só quebrava nos pacotes com binário nativo, que o webpack não sabe ler.
// Foi por isso que bcrypt, fsevents e @next/swc-darwin-arm64 ganharam entrada
// manual ao longo do tempo — três remendos do mesmo defeito, e `sharp` seria o
// quarto. Apontar para a raiz resolve a classe inteira.
const rootModulesDir = path.resolve(__dirname, '../../node_modules')
const localModulesDir = path.resolve(__dirname, 'node_modules')

// Caminho absoluto a partir do __dirname, não do cwd, para não depender de onde
// o comando foi chamado. E falha alto: sem isto, diretório errado volta vazio e
// o defeito reaparece calado.
if (!fs.existsSync(rootModulesDir)) {
  throw new Error(
    `webpack.config.js: não encontrei o node_modules da raiz em ${rootModulesDir}. ` +
      'Sem ele nada é externalizado e o bundle quebra em qualquer dependência nativa.',
  )
}

module.exports = (options) => {
  return {
    ...options,
    // Dependências ficam de fora do bundle — estão presentes em runtime.
    // Só @app/shared é empacotado, para o pacote do monorepo resolver.
    externals: [
      nodeExternals({
        modulesDir: rootModulesDir,
        additionalModuleDirs: [localModulesDir],
        allowlist: [/@app\/shared/],
      }),
    ],
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve?.alias || {}),
        '@app/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  }
}
