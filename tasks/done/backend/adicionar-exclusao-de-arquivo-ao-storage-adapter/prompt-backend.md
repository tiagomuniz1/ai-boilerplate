Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar
- Modificar apenas os 3 arquivos indicados (interface + 2 implementações) e seus `.spec.ts` — não recriar do zero
- Não alterar nenhum use-case de `exams`/`clinics`

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Exclusão de Arquivo no Storage Adapter (Backend / Infra)

## Descrição
Adicionar `remove(path: string): Promise<void>` a `IStorageAdapter` (`apps/backend/src/common/adapters/storage.adapter.interface.ts`) e implementar nas duas classes concretas: `StorageAdapter` (S3) e `LocalStorageAdapter` (disco). Hoje a interface só tem `upload`/`download`; nenhum módulo remove o arquivo do storage ao excluir o registro no banco. Esta task fecha essa lacuna para ser consumida depois pelo módulo de fotos da consulta.

## Contexto
`IStorageAdapter` é consumida por `clinics`/`exams`, cada um com sua própria factory condicional (`AWS_S3_BUCKET`/`AWS_REGION` → `StorageAdapter`; senão `LocalStorageAdapter`) — não mudar esse padrão. Esta task só adiciona o método na interface e nas duas implementações; nenhum use-case existente é alterado. `StorageAdapter` já usa `@aws-sdk/client-s3` (`PutObjectCommand`/`GetObjectCommand`) — adicionar `DeleteObjectCommand`. `LocalStorageAdapter` escreve em `uploads-private/` — adicionar remoção via `fs.unlink`, tolerando `ENOENT`.

## Assinatura
```ts
abstract remove(path: string): Promise<void>
```
Idempotente: não lança erro se o objeto/arquivo já não existir.

## Assinaturas esperadas
- `IStorageAdapter`: adicionar `abstract remove(path: string): Promise<void>` (mantendo `upload`/`download` como estão).
- `StorageAdapter.remove(path)`: `client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))`.
- `LocalStorageAdapter.remove(path)`: `fs.promises.unlink(fullPath)` em `try/catch`; se `error.code === 'ENOENT'`, engolir; qualquer outro erro, propagar.

## Regras de negócio
`remove()` nunca lança erro por "não encontrado". Nenhum use-case existente é modificado.

## Restrições
NÃO alterar use-cases de `exams`/`clinics`. NÃO lançar exceção para objeto/arquivo já inexistente. NÃO adicionar bulk delete. NÃO alterar assinatura de `upload`/`download`.

## Estrutura esperada
```
apps/backend/src/common/adapters/
  storage.adapter.interface.ts   → MODIFICAR
  storage.adapter.ts             → MODIFICAR (+ .spec)
  local-storage.adapter.ts       → MODIFICAR (+ .spec)
```

## Cenários de teste
- `StorageAdapter.remove`: chama `DeleteObjectCommand` com `Bucket`/`Key` corretos; propaga erro de rede/credencial.
- `LocalStorageAdapter.remove`: remove arquivo existente; path inexistente (`ENOENT`) resolve sem erro; outro erro de filesystem propaga.

## Definition of Done
- [ ] `IStorageAdapter.remove(path)` adicionado
- [ ] `StorageAdapter.remove` com `DeleteObjectCommand`
- [ ] `LocalStorageAdapter.remove` com `fs.unlink` tolerando `ENOENT`
- [ ] Nenhum use-case existente alterado
- [ ] Testes unitários (100%) cobrindo todos os cenários
- [ ] Naming convention e estrutura seguidas
