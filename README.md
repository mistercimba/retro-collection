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
- Password obrigatória em produção, com cookie HttpOnly através de `APP_PASSWORD`.
- Manifest + service worker simples para instalação como PWA; nesta fase não guarda páginas privadas em cache.

A Google Sheet continua a ser a **source of truth**. Esta primeira fase é read-only.

## Requisitos

1. Node.js 22.x.
2. npm.
3. Para dados reais: uma conta Google Cloud e acesso à sheet `Mario Retro Collection OS`.

## Correr localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

Em desenvolvimento, sem configuração Google, a app abre em **modo demonstração**. Se começares a configurar Google mas faltar uma variável, a app falha claramente em vez de ocultar o erro com dados mock. Em produção, configura `DATA_PROVIDER=google`; sem credenciais reais, não serve demonstração.

## Ligar à Google Sheet real

### 1. Criar projeto no Google Cloud

1. Abre Google Cloud Console.
2. Cria um projeto (por exemplo `retro-collection`).
3. Em **APIs & Services > Library**, ativa **Google Drive API** e **Google Sheets API**. A configuração atual é uma Google Sheet nativa; o Drive API identifica o ficheiro e o Sheets API lê os separadores.

### 2. Criar Service Account

1. Vai a **IAM & Admin > Service Accounts**.
2. Cria uma service account.
3. Não é necessário dar-lhe permissões gerais no projeto para este caso.
4. Abre a service account > **Keys > Add key > Create new key > JSON**.
5. Guarda o JSON em local seguro. **Nunca o metas no GitHub.**

### 3. Partilhar o ficheiro

No JSON tens um campo `client_email`, semelhante a:

```text
retro-collection@project-id.iam.gserviceaccount.com
```

No ficheiro `Mario Retro Collection`, carrega em **Partilhar** e adiciona esse email como **Viewer/Leitor**. A app só faz leitura; não altera nem reestrutura o workbook.

### 4. Configurar `.env.local`

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=retro-collection@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DATA_PROVIDER=auto
APP_PASSWORD=uma-password-tua
```

Copia `private_key` do JSON. Se vier em várias linhas, mantém os `\n` escapados como no exemplo.

Reinicia `npm run dev`. No início do dashboard deixa de aparecer o aviso de modo demonstração quando a integração estiver ativa.

## Como os dados são lidos

A app lê os separadores relevantes do ficheiro:

- `COLLECTION!A1:Z1200`
- `AUDIT LOG!A1:U1200`
- `GB!B6:B300` e `GBC!B6:B300` apenas para preservar a separação Game Boy / Game Boy Color
- separadores `<plataforma> PLAN` (com o título `PLAN DE COLEÇÃO`) para gerar a wishlist viva
- `PURCHASES` e `VALUATIONS` para contexto de compra e snapshots de valor

`COLLECTION` é a fonte canónica. Os detalhes de auditoria são ligados por `Collection ID`.

### Wishlist e pesquisa de mercado

`/want` apresenta os alvos ativos dos planos por prioridade, limite de preço e motivo. Só marca um alvo como adquirido quando o estado do PLAN é ativo e título, plataforma e variante registada são compatíveis; estados desconhecidos, edições/regiões em falta e correspondências incertas ficam visíveis para revisão. Cada jogo tem atalhos para pesquisas em PriceCharting, CeX Portugal, Vinted, OLX, eBay, HowLongToBeat e Metacritic. Estes são links de pesquisa, não cotações automáticas.

### Dados de catálogo, notas, duração e valor

Os detalhes são carregados no servidor quando se abre uma ficha e ficam em cache por 24 horas (o snapshot de preços por uma hora). A wishlist continua a ser recalculada a partir da coleção e do estado dos separadores PLAN.

- **IGDB:** configura `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET` (credenciais Twitch). Correspondência exige título exato normalizado e plataforma exata; fichas ambíguas ou sem correspondência não recebem dados. Géneros, sinopse, lançamento, estúdios, modos, temas, ratings IGDB e tempos `Main Story`, `Main + Extras` e `Completionist` vêm das APIs oficiais IGDB. Sem credenciais ou sem dados, a ficha indica indisponibilidade.
- **Metascore:** configura `RAWG_API_KEY`. Só é mostrado quando título e plataforma correspondem de forma única, usando a nota específica dessa plataforma. A atribuição à RAWG aparece junto ao dado. A app só consulta RAWG quando `APP_PASSWORD` protege a coleção e não guarda os dados RAWG no repositório. Sem chave ou match seguro, aparece “Não disponível”. Não é usado scraping do Metacritic.
- **Valor atual:** a app lê, em cache de uma hora, o snapshot PAL já validado em `mistercimba/vinted-retro-search`. Como esse repositório é privado, configura `PRICECHARTING_CATALOG_GITHUB_TOKEN` com um Fine-grained PAT de leitura de Contents limitado apenas a esse repositório. O match é exato por plataforma/título/alias e só aceita um produto único; variante incerta fica sem preço. A condição `Loose`, `CIB` ou `New` vem dos dados da cópia, o valor USD é convertido para EUR pela taxa do BCE e a ficha mostra a data do snapshot e o link direto do produto. Esta app não usa a API paga nem faz scraping PriceCharting. CeX, Vinted, OLX e eBay permanecem atalhos de pesquisa.

Define estas variáveis também no ambiente de deploy para obter dados reais. A app não altera o workbook. `npm run metadata:refresh` continua disponível como ferramenta local de snapshot IGDB, mas não é necessário para a atualização normal das fichas.

No browsing normal aparecem apenas linhas com `Keep Status = Collection`.

`/sell` apresenta `Keep Status = Sell`. `Sold` fica fora da lista de venda atual.

## Password da app

`APP_PASSWORD` é opcional em desenvolvimento e obrigatório em produção porque a app mostra uma coleção pessoal e consulta RAWG apenas com acesso privado.

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
   - `DATA_PROVIDER=google`
   - `IGDB_CLIENT_ID`
   - `IGDB_CLIENT_SECRET`
   - `RAWG_API_KEY`
   - `PRICECHARTING_CATALOG_GITHUB_TOKEN`
   - opcionalmente `PRICECHARTING_CATALOG_REF=main`
6. Deploy.

Os valores privados acima nunca devem ser commitados. Define as variáveis em Preview e Production no Vercel antes do deploy. Configuração Google incompleta ou ausência de password em produção causa erro explícito; o build não usa mock silenciosamente.

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

Wishlist artwork is imported as local files using a temporary target export:

```bash
npm run wishlist-artwork:import -- --input /tmp/wishlist-targets.json
```
