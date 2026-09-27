# Mário's Retro Collection

## Estado atual

- Código em `main`: [`2b30317`](https://github.com/mistercimba/retro-collection/commit/2b303178df41b6e12c5358923e7d6457d86bd43e).
- Artwork local: **516/516 jogos com capa**, 0 em falta; *The Hunt for Red October* agora usa a caixa PAL/NOE.
- CI GitHub Actions passou em `2dbe4b5`; o check Vercel passou no commit final `2b30317`.
- Dados de produção: **por confirmar**. A documentação anterior divergia entre mock/demo e uma confirmação histórica `provider: google` via `/api/health`. Revalidar a ligação atual à Sheet antes de a afirmar como ativa.

Web app/PWA privada e mobile-first para consultar a coleção retro sem abrir o Google Sheets.

## O que já existe

- Dashboard com pesquisa rápida, KPIs e plataformas.
- `/collection` com pesquisa, filtros e ordenação.
- `/platform/[slug]` para navegar por consola.
- `/game/[collectionId]` com detalhes da cópia + AUDIT LOG.
- `/sell` para duplicados/PSP marcados `Sell`.
- Modo mock quando não existem credenciais Google.
- Leitura server-side do Google Sheets; as credenciais nunca são enviadas ao browser.
- Password opcional com cookie HttpOnly através de `APP_PASSWORD`.
- Manifest + service worker simples para instalação como PWA; nesta fase não guarda páginas privadas em cache.

A Google Sheet continua a ser a **source of truth**. Esta primeira fase é read-only.

## Requisitos

1. Node.js 20.9 ou superior.
2. npm.
3. Para dados reais: uma conta Google Cloud e acesso à sheet `Mario Retro Collection OS`.

## Correr localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

Se não preencheres as credenciais Google, a app abre automaticamente em **modo demonstração** com dados mock.

## Ligar à Google Sheet real

### 1. Criar projeto no Google Cloud

1. Abre Google Cloud Console.
2. Cria um projeto (por exemplo `retro-collection`).
3. Em **APIs & Services > Library**, ativa **Google Sheets API**.

### 2. Criar Service Account

1. Vai a **IAM & Admin > Service Accounts**.
2. Cria uma service account.
3. Não é necessário dar-lhe permissões gerais no projeto para este caso.
4. Abre a service account > **Keys > Add key > Create new key > JSON**.
5. Guarda o JSON em local seguro. **Nunca o metas no GitHub.**

### 3. Partilhar a sheet

No JSON tens um campo `client_email`, semelhante a:

```text
retro-collection@project-id.iam.gserviceaccount.com
```

Na Google Sheet, carrega em **Partilhar** e adiciona esse email como **Viewer/Leitor**.

### 4. Configurar `.env.local`

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1AqBr6wzbnDB1eWVc-ZG_IF5gTjJyFSCUmbARAtN8FLA
GOOGLE_SERVICE_ACCOUNT_EMAIL=retro-collection@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DATA_PROVIDER=auto
APP_PASSWORD=uma-password-tua
```

Copia `private_key` do JSON. Se vier em várias linhas, mantém os `\n` escapados como no exemplo.

Reinicia `npm run dev`. No início do dashboard deixa de aparecer o aviso de modo demonstração quando a integração estiver ativa.

## Como os dados são lidos

A app lê apenas:

- `COLLECTION!A1:Z1200`
- `AUDIT LOG!A1:U1200`
- `GB!B6:B300` e `GBC!B6:B300` apenas para preservar a separação Game Boy / Game Boy Color

`COLLECTION` é a fonte canónica. Os detalhes de auditoria são ligados por `Collection ID`.

No browsing normal aparecem apenas linhas com `Keep Status = Collection`.

`/sell` apresenta `Keep Status = Sell`. `Sold` fica fora da lista de venda atual.

## Password da app

`APP_PASSWORD` é opcional em desenvolvimento. Em produção é altamente recomendado porque a app mostra uma coleção pessoal.

Quando configurada:

- a app pede password;
- a password é validada no servidor;
- o browser recebe apenas um cookie HttpOnly derivado;
- não existe sistema de contas/multiutilizador.

## Deploy na Vercel

1. Faz login na Vercel com GitHub.
2. **Add New > Project**.
3. Importa `mistercimba/retro-collection`.
4. Framework: Next.js (detetado automaticamente).
5. Em **Environment Variables**, adiciona:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `APP_PASSWORD`
   - opcionalmente `DATA_PROVIDER=google`
6. Deploy.

Se usares `DATA_PROVIDER=google`, um deploy sem credenciais falha de propósito em vez de mostrar mock data.

## Confirmar que estás a ler a sheet real

1. Certifica-te de que a service account tem acesso de leitura à sheet.
2. Configura as três variáveis Google.
3. Reinicia localmente ou redeploy na Vercel.
4. Confirma que os totais/plataformas correspondem à sheet atual.
5. Pesquisa um Collection ID real e abre a página do jogo.

## Comandos de qualidade

```bash
npm run lint
npm run test
npm run build
npm run check
```

## Segurança

- Nunca fazer commit de `.env.local` ou do JSON da service account.
- O Google Private Key é usado apenas no servidor.
- A app é read-only: não escreve na Google Sheet.
- O artwork usado pela app é servido localmente; a TheGamesDB API só é usada pelo importador de manutenção.

## Próximas fases

Ver `PROJECT_CHECKLIST.md`.

## Artwork local

As capas dos jogos e as imagens das plataformas são ficheiros estáticos do próprio projeto. A aplicação não procura artwork online durante a navegação.

- **516/516 jogos físicos do snapshot atual têm artwork local.**
- O import tenta primeiro bases estruturadas/serializadas e só aceita fallbacks quando a plataforma, região e identidade do jogo estão suficientemente verificadas.
- Para consolas com variantes regionais, a artwork segue `artworkPolicy` e privilegia caixas PAL/Europe, mesmo quando a cópia física é NTSC. A região da capa fica registada separadamente da região física.
- Imports curados com política PAL rejeitam imagens NTSC; a exceção NTSC existente está a ser substituída pela caixa PAL NOE de *The Hunt for Red October*. Para PC, onde PAL/NTSC não define a embalagem, uma capa `World` pode ser usada quando não há edição PAL distinta.
- Capa frontal é preferida; cartucho/disco é aceite quando representa melhor a variante física correta.
- As imagens aprovadas são descarregadas para `public/covers/` e servidas localmente depois disso.
- O mapa Collection ID → ficheiro local é gerado em `src/data/game-artwork.ts`.
- Imagens locais das consolas: `public/platforms/`.
- Snapshot dos jogos físicos atuais: `data/artwork-games.json`.
- Casos por resolver: `data/artwork-missing.json` — atualmente vazio.
- Manifesto auditável dos matches: `public/covers/manifest.json`.

Fontes atualmente usadas no acervo local incluem TheGamesDB, GameTDB, LaunchBox, libretro-thumbnails com validação por serial/título, PSXDataCenter e alguns URLs curados de itens exatos. Nenhuma destas fontes é consultada pela app em runtime.

Comandos:

```bash
npm run artwork:import
npm run artwork:status
```

