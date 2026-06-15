# Task — Upload de Logomarca e Favicon da Clínica (Frontend)

## Descrição
Implementar upload de logomarca e favicon na área de configurações da clínica, exibir a logo nos locais onde a identidade visual da clínica é apresentada (sidebar), e aplicar o favicon dinamicamente no browser. O frontend envia os arquivos ao backend, que os armazena no **AWS S3** e devolve as URLs públicas — o frontend nunca interage diretamente com o S3. Quando nenhum arquivo estiver cadastrado, o comportamento atual é mantido.

**Pré-requisito:** task backend **upload-logomarca-clinica** concluída — `ClinicResponseDto` com campos `logoUrl: string | null` e `faviconUrl: string | null` (URLs públicas do S3) e endpoints `POST /clinics/me/logo` e `POST /clinics/me/favicon` disponíveis.

---

## Contexto
- `IClinicModel` passa a ter `logoUrl: string | null` e `faviconUrl: string | null` — URLs públicas de objetos armazenados no **AWS S3**.
- O frontend envia os arquivos para o backend via `multipart/form-data`. O backend faz o upload ao S3 e retorna a URL pública; o frontend nunca acessa o S3 diretamente.
- O upload é feito pela tela de edição da clínica, acessível ao ADMIN.
- A logo é exibida no sidebar no lugar da letra inicial, quando disponível.
- O favicon é aplicado dinamicamente via tag `<link rel="icon">` no `<head>` do documento assim que a clínica é carregada, substituindo o favicon padrão da aplicação.
- Em qualquer lugar onde hoje aparece a inicial da clínica, a logo deve aparecer se disponível — sem quebrar o layout quando ausente.

---

## Contratos

### Tipos locais (atualização)

```ts
// types/clinic.types.ts
export interface IClinicModel {
  id: string
  name: string
  slug: string
  isActive: boolean
  logoUrl: string | null    // novo campo
  faviconUrl: string | null // novo campo
  createdAt: Date
  updatedAt: Date
}
```

---

## Assinaturas esperadas

```ts
// service
clinicsService.uploadLogo(file: File): Promise<ClinicResponseDto>
// chama POST /clinics/me/logo com multipart/form-data

clinicsService.uploadFavicon(file: File): Promise<ClinicResponseDto>
// chama POST /clinics/me/favicon com multipart/form-data

// use-cases
uploadClinicLogoUseCase(file: File): Promise<IClinicModel>
uploadClinicFaviconUseCase(file: File): Promise<IClinicModel>

// hooks
useUploadClinicLogo(): UseMutationResult<IClinicModel, IApiError, File>
// onSuccess: invalida ['clinics', 'me']

useUploadClinicFavicon(): UseMutationResult<IClinicModel, IApiError, File>
// onSuccess: invalida ['clinics', 'me']
```

---

## Fluxo principal

### Upload de logo (tela de configurações/edição da clínica)
1. Usuário acessa a tela de edição da clínica.
2. Seção de logo exibe a logo atual (se existir) ou um placeholder com a letra inicial.
3. Botão "Alterar logo" abre o seletor de arquivo nativo.
4. Validação client-side: tipo (jpeg/png/webp) e tamanho (máx 2MB) — erro inline se inválido.
5. Arquivo válido → `useUploadClinicLogo` envia para `POST /clinics/me/logo`.
6. Loading durante o envio — botão desabilitado, indicador visual.
7. Sucesso → query `['clinics', 'me']` invalidada → sidebar atualiza automaticamente.
8. Erro → mensagem amigável inline (sem redirecionar).

### Upload de favicon (tela de configurações/edição da clínica)
1. Seção de favicon exibe o favicon atual (se existir) ou um placeholder genérico.
2. Botão "Alterar favicon" abre o seletor de arquivo nativo.
3. Validação client-side: tipo (ico/png/svg) e tamanho (máx 512KB) — erro inline se inválido.
4. Arquivo válido → `useUploadClinicFavicon` envia para `POST /clinics/me/favicon`.
5. Loading durante o envio — botão desabilitado, indicador visual.
6. Sucesso → query `['clinics', 'me']` invalidada → favicon no browser atualiza automaticamente.
7. Erro → mensagem amigável inline.

### Aplicação dinâmica do favicon
- Um componente client-side `ClinicFaviconApplier` (sem output DOM, similar ao `AuthInitializer`) observa `useCurrentClinic` e injeta/atualiza a tag `<link rel="icon" href={faviconUrl}>` no `<head>` quando `faviconUrl` estiver disponível.
- Quando `faviconUrl` for `null`, remove a tag injetada e o browser volta a usar o favicon padrão da aplicação (`/favicon.ico`).
- `ClinicFaviconApplier` deve ser montado no layout autenticado (`app/(authenticated)/layout.tsx`).

### Exibição no sidebar
- `useCurrentClinic` já retorna `logoUrl`.
- Se `logoUrl` presente: exibir `<img>` com a logo.
  - Sidebar expandido: logo à esquerda do nome da clínica (substitui o quadrado com letra).
  - Sidebar colapsado: logo centralizada como ícone quadrado.
- Se `logoUrl` ausente: manter comportamento atual (quadrado colorido com letra inicial).

---

## Estados e feedbacks

- Upload em progresso → botão desabilitado, spinner visível
- Arquivo inválido (tipo/tamanho) → mensagem de erro inline abaixo do input, sem enviar
- Erro de rede/API → mensagem amigável: "Não foi possível enviar o arquivo. Tente novamente."
- Sucesso logo → logo atualiza no sidebar imediatamente via React Query
- Sucesso favicon → favicon no browser atualiza imediatamente via `ClinicFaviconApplier`

---

## Regras de negócio

- Validação client-side deve acontecer antes do envio (não aguardar resposta do servidor).
- Logo — tipos aceitos: `image/jpeg`, `image/png`, `image/webp` / tamanho máximo: 2MB.
- Favicon — tipos aceitos: `image/x-icon`, `image/png`, `image/svg+xml` / tamanho máximo: 512KB.
- O upload substitui o arquivo anterior — não há confirmação, o usuário pode enviar outro a qualquer momento.
- A logo no sidebar deve ter `alt` com o nome da clínica para acessibilidade.
- Imagem no sidebar deve ter dimensões fixas e `object-fit: contain` para não distorcer logos de formatos variados.
- `ClinicFaviconApplier` não deve causar flash — só altera o `<link>` após `useCurrentClinic` resolver, não durante loading.

---

## Dependências

- `clinicsService` (adição dos métodos `uploadLogo` e `uploadFavicon`)
- `apiClient` (existente — usar para multipart/form-data com `FormData`)
- `useCurrentClinic` (existente — passa a retornar `logoUrl` e `faviconUrl`)
- React Query
- Componente de `Alert` ou mensagem de erro inline existente

---

## Decisões técnicas da task

- **FormData:** o `apiClient.post` já aceita qualquer `unknown` como body — passar `FormData` diretamente funciona; o axios detecta e define o `Content-Type: multipart/form-data` automaticamente.
- **React Query:** invalidar `['clinics', 'me']` no `onSuccess` do mutation atualiza sidebar e favicon sem reload.
- **Zustand:** não — logo e favicon são dados de servidor, gerenciados pelo React Query.
- **Validação:** client-side no handler do `onChange` do input file, antes de acionar o mutation.
- **`ClinicFaviconApplier`:** componente client-side sem output DOM — padrão já usado pelo `AuthInitializer`. Manipula diretamente o `document.head` via `useEffect`.

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`.
- NÃO armazenar `logoUrl` ou `faviconUrl` em Zustand.
- NÃO mapear DTOs dentro de componentes ou hooks — usar `toClinicModel`.
- NÃO exibir URL técnica do S3 ao usuário em mensagens de erro.
- NÃO quebrar o sidebar quando `logoUrl` for `null` — fallback obrigatório.
- NÃO alterar o favicon durante o estado de loading — aguardar `useCurrentClinic` resolver.

---

## Estrutura esperada

```
components/features/clinics/
  services/
    clinics.service.ts                  → adicionar uploadLogo() e uploadFavicon()
  use-cases/
    upload-clinic-logo.use-case.ts      → novo
    upload-clinic-favicon.use-case.ts   → novo
  hooks/
    use-upload-clinic-logo.hook.ts      → novo
    use-upload-clinic-favicon.hook.ts   → novo
  types/
    clinic.types.ts                     → adicionar logoUrl e faviconUrl em IClinicModel
  mappers/
    to-clinic-model.ts                  → mapear logoUrl e faviconUrl
  components/
    clinic-favicon-applier.tsx          → novo (sem output DOM, aplica favicon dinamicamente)

components/ui/organisms/sidebar/
  sidebar.tsx                           → exibir logo ou fallback com letra inicial

app/(authenticated)/
  layout.tsx                            → montar <ClinicFaviconApplier />
```

---

## Cenários de teste adicionais

**Hooks `useUploadClinicLogo` e `useUploadClinicFavicon`:**
- Sucesso → invalida `['clinics', 'me']`
- Erro → não invalida queries

**`ClinicFaviconApplier`:**
- Quando `faviconUrl` presente → injeta `<link rel="icon">` no `<head>` com o href correto
- Quando `faviconUrl` é `null` → remove a tag `<link rel="icon">` injetada
- Durante loading (`useCurrentClinic` pendente) → não altera o `<head>`

**Sidebar:**
- Renderiza `<img>` com `src={logoUrl}` quando `logoUrl` está presente
- Renderiza letra inicial quando `logoUrl` é `null`
- Renderiza letra inicial quando `useCurrentClinic` retorna `undefined` (loading)
- Logo tem `alt` com o nome da clínica

**Validação client-side (logo e favicon):**
- Arquivo com tipo inválido → exibe erro, não aciona mutation
- Arquivo acima do limite de tamanho → exibe erro, não aciona mutation
- Arquivo válido → aciona mutation sem erro de validação

---

## Definition of Done

- [ ] `IClinicModel` atualizado com `logoUrl` e `faviconUrl`
- [ ] `toClinicModel` mapeando `logoUrl` e `faviconUrl`
- [ ] `clinicsService.uploadLogo()` e `uploadFavicon()` implementados com `FormData`
- [ ] `uploadClinicLogoUseCase` e `uploadClinicFaviconUseCase` implementados
- [ ] `useUploadClinicLogo` e `useUploadClinicFavicon` com invalidação de `['clinics', 'me']`
- [ ] UI de upload na tela de edição (logo + favicon, cada um com preview + botão + validação inline)
- [ ] `ClinicFaviconApplier` implementado e montado no layout autenticado
- [ ] Sidebar exibe logo quando disponível, fallback com letra inicial quando ausente
- [ ] Logo no sidebar com `alt`, dimensões fixas e `object-fit: contain`
- [ ] Testes unitários com 100% de cobertura (use-cases, hooks, mapper)
- [ ] Testes de integração: sidebar (com/sem logo), `ClinicFaviconApplier` (com/sem favicon, durante loading)
- [ ] Sem `axios` importado fora de `lib/api-client.ts`
- [ ] Sem dados de logo ou favicon armazenados em Zustand
