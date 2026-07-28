# Task — Exclusão de Arquivo no Storage Adapter (Backend / Infra)

## Descrição
Adicionar um método `remove(path: string): Promise<void>` à interface `IStorageAdapter` e implementá-lo nas duas classes concretas (`StorageAdapter`, S3; `LocalStorageAdapter`, disco). Hoje a interface só tem `upload`/`download` — nenhum módulo que faz upload de arquivo (`clinics`, `exams`) remove o objeto do storage ao excluir o registro no banco, deixando arquivos órfãos para sempre. Esta task fecha essa lacuna na camada compartilhada, para ser consumida pela task `criar-modulo-de-fotos-da-consulta` (que fará exclusão real de arquivo ao excluir uma foto).

---

## Contexto
- `IStorageAdapter` (`apps/backend/src/common/adapters/storage.adapter.interface.ts`) é consumida por múltiplos módulos (`clinics`, `exams`), cada um registrando sua própria factory condicional (`AWS_S3_BUCKET`/`AWS_REGION` definido → `StorageAdapter`; senão → `LocalStorageAdapter`) — duplicar a factory por módulo é o padrão já aceito no projeto, não mudar isso.
- Esta task **só adiciona o método na interface e nas duas implementações** — não altera nenhum use-case existente (`exams`/`clinics` continuam sem chamar `remove()`, fica registrado como fast-follow fora de escopo). Nenhum módulo consumidor quebra: é uma adição pura à interface, ambas implementações precisam do método para a interface `abstract class` compilar.
- `StorageAdapter` usa `@aws-sdk/client-s3` (`PutObjectCommand`/`GetObjectCommand` já em uso) — adicionar `DeleteObjectCommand`.
- `LocalStorageAdapter` escreve em `uploads-private/` no disco (dev) — adicionar remoção via `fs.unlink`, tolerando arquivo já inexistente (`ENOENT`) sem lançar erro (o caller deste método deve poder chamar de forma best-effort).

---

## Contratos

### Assinatura
```ts
abstract remove(path: string): Promise<void>
```
- `path`: mesma string de key/caminho retornada por `upload()` (ex.: `consultation-photos/{clinicId}/{appointmentId}/{photoId}.jpg`).
- Resolve sem erro mesmo se o objeto não existir (idempotente) — quem chama pode invocar `remove()` sobre um path que já foi removido antes sem que isso vire uma exceção.

---

## Assinaturas esperadas

**`IStorageAdapter`** (`common/adapters/storage.adapter.interface.ts`):
```ts
export abstract class IStorageAdapter {
  abstract upload(buffer: Buffer, path: string, mimeType: string): Promise<string>
  abstract download(path: string): Promise<Buffer>
  abstract remove(path: string): Promise<void>
}
```

**`StorageAdapter`** (`common/adapters/storage.adapter.ts`): `async remove(path: string): Promise<void>` — `client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))`. S3 `DeleteObjectCommand` já é idempotente por natureza (não erra se a key não existir) — não precisa de tratamento extra de "já não existe".

**`LocalStorageAdapter`** (`common/adapters/local-storage.adapter.ts`): `async remove(path: string): Promise<void>` — `fs.promises.unlink(fullPath)` dentro de `try/catch`; se `error.code === 'ENOENT'`, engolir (arquivo já não existe, sucesso do ponto de vista do chamador); qualquer outro erro, propagar.

---

## Fluxo principal
Não há fluxo HTTP nesta task — é uma extensão de interface/implementação de baixo nível, sem controller/use-case próprio. O "fluxo" é: o método é chamado por um use-case de outro módulo (fora de escopo aqui) passando o `path` armazenado, e a implementação ativa (S3 ou local, conforme env) remove o objeto correspondente.

---

## Regras de negócio
- `remove()` nunca lança erro por "arquivo não encontrado" — idempotência é responsabilidade da implementação, não do chamador.
- Nenhum use-case existente (`exams`, `clinics`) é modificado nesta task.

---

## Dependências
- `@aws-sdk/client-s3` (já é dependência do projeto, `DeleteObjectCommand` faz parte do mesmo pacote de `PutObjectCommand`/`GetObjectCommand`).
- `fs`/`fs.promises` (Node, sem dependência nova).

---

## Decisões técnicas
- Não adicionar retry/circuit breaker específico para `remove()` — mesma postura de resiliência já usada em `upload`/`download` (sem timeout customizado hoje, herda o comportamento padrão do SDK).
- Não deletar em lote/batch nesta task — assinatura é sempre um path por vez, chamada individualmente pelo consumidor.

---

## Restrições
- NÃO alterar nenhum use-case de `exams`/`clinics` para chamar `remove()` — fora de escopo, feature/fast-follow separado.
- NÃO lançar exceção quando o objeto/arquivo já não existir.
- NÃO adicionar método de exclusão em lote (bulk delete) — apenas um path por chamada.
- NÃO alterar a assinatura de `upload`/`download` existentes.

---

## Estrutura esperada
```
apps/backend/src/common/adapters/
  storage.adapter.interface.ts   → MODIFICAR (+ abstract remove)
  storage.adapter.ts             → MODIFICAR (+ remove, S3 DeleteObjectCommand) (+ .spec MODIFICAR)
  local-storage.adapter.ts       → MODIFICAR (+ remove, fs.unlink tolerando ENOENT) (+ .spec MODIFICAR)
```

---

## Cenários de teste

### `StorageAdapter.remove`
- Chama `client.send` com `DeleteObjectCommand` e `{ Bucket, Key: path }` corretos.
- Propaga erro se o client S3 rejeitar por motivo diferente de "não encontrado" (ex.: falha de rede/credencial).

### `LocalStorageAdapter.remove`
- Remove um arquivo existente com sucesso (`fs.promises.unlink` chamado com o path correto).
- Path inexistente (`ENOENT`) → resolve sem lançar erro.
- Outro erro do filesystem (ex.: permissão) → propaga a exceção.

---

## Definition of Done
- [ ] `IStorageAdapter.remove(path)` adicionado à interface
- [ ] `StorageAdapter.remove` implementado com `DeleteObjectCommand`
- [ ] `LocalStorageAdapter.remove` implementado com `fs.unlink`, tolerando `ENOENT`
- [ ] Nenhum use-case existente alterado
- [ ] Testes unitários (100%) cobrindo os cenários acima, incluindo o caso de arquivo já inexistente
- [ ] Naming convention e estrutura seguidas
