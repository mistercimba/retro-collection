# Mário's Retro Collection

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
- Manifest + service worker simples para instalação como PWA.

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
- Não existem APIs de preço externas nem scraping de capas nesta fase.

## Próximas fases

Ver `PROJECT_CHECKLIST.md`.
