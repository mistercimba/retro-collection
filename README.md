# Mário's Retro Collection

Web app/PWA privada para gerir uma coleção física de videojogos e a respetiva
wishlist. Next.js App Router, TypeScript, Tailwind, Node.js 22 e Vercel.

## O que a app faz

- Dashboard, pesquisa, filtros e ordenação por coleção/plataforma.
- Collection e Wishlist com criação, edição e remoção de jogos.
- Compra de um target da Wishlist: cria a cópia e o registo de compra na Collection.
- Detalhes da cópia, edição dos dados de compra, fotos privadas da cópia e consulta das valuations associadas.
- Para vender/Vendidos e histórico das alterações feitas na app.
- Metadata, capas e imagens das plataformas locais; referências de preço e links de pesquisa.
- PWA com consulta offline limitada da coleção previamente sincronizada.

Rotas principais: `/`, `/collection`, `/collection/games`, `/platform/[slug]`,
`/game/[collectionId]`, `/want`, `/wish/[targetId]`, `/sell`, `/search` e `/history`.

## Arquitetura e dados

A app é a source of truth dos dados pessoais mutáveis. Os dados estruturados vivem
num **private Vercel Blob**, no caminho fixo `retro-collection/library.json`:

```ts
{
  schemaVersion: 1,
  updatedAt: string,
  collection: [],
  wishlist: [],
  purchases: [],
  valuations: [],
  history: []
}
```

`src/lib/library-store.ts` lê o Blob e grava as alterações por read-modify-write;
`src/lib/library-actions.ts` implementa as ações da app. O Blob é necessário no
runtime: se faltar ou for inválido, a leitura falha. Não há seed automático,
fallback para Google ou reposição automática a partir do snapshot encriptado.
Blobs antigos sem `history` são lidos com histórico vazio; não se inventa histórico
anterior à introdução desse registo.

Fotos da cópia física usam o mesmo store privado, em objetos separados sob
`retro-collection/copy-photos/<collectionId>/...`. O `library.json` guarda apenas
metadata e o pathname de cada foto. Upload, leitura e remoção passam por rotas
autenticadas da própria app; os bytes não são públicos nem são embebidos no JSON.
Imagens grandes são reduzidas no browser antes do upload e o servidor aceita
JPEG, PNG, WebP ou AVIF até 4 MB após essa preparação.

Google Sheets é apenas contexto de migração/manutenção legado. Os antigos PLAN
significavam prioridade pessoal; a migração originou os targets atuais, que agora
são geridos na app. `DATA_PROVIDER=mock/google/snapshot` e as credenciais Google
não selecionam a fonte usada pelas páginas atuais da biblioteca.

### Metadata e preços

- **Metadata:** `src/data/game-metadata.json`, importado estaticamente. Baseline
  aceite: **454/495 (91,7%)**, com 41 unresolved aceites. Jogos adicionados na app
  podem obter um match único por título ou ficar sem metadata. Não há chamadas
  IGDB/RAWG durante a navegação normal.
- **PriceCharting:** leitura server-side do snapshot PAL privado
  `data/reference/pricecharting-pal-catalog.json` em `mistercimba/vinted-retro-search`.
  Cache de uma hora; USD → EUR com ECB/BCE, cuja taxa tem cache de 24 horas.
  O match exige produto único e respeita edição e condição Loose/CIB/New.
  Falhas ou ausência de configuração deixam o preço indisponível. Esta app não
  faz scraping nem usa a API paga do PriceCharting.
- **CeX Portugal:** leitura server-side do catálogo de referência partilhado em
  `mistercimba/vinted-retro-search`. A Wishlist usa matching conservador e,
  quando existe uma variante segura, o midpoint entre cash-buy e sell como uma
  das componentes da referência de compra. Produtos web-visíveis podem servir
  de referência mesmo sem stock; ambiguidades e edições incompatíveis falham
  fechadas. Esta app não faz scraping CeX no runtime.
- Vinted, OLX, eBay, HowLongToBeat e Metacritic continuam a ser links/fontes de
  pesquisa ou metadata, não integrações adicionais de cotações da Wishlist.

### Artwork local

Collection: `public/covers/`, `public/covers/manifest.json` e
`src/data/game-artwork.ts`. Plataformas: `public/platforms/`. Novos jogos sem match
local seguro usam fallback; a existência de uma capa não é garantida para todos
os jogos que venham a ser adicionados.

Wishlist: **139/298 (46,6%)** no relatório final do PR #28, 0 capas reutilizadas da
Collection e 159 fallback. Os 144 ficheiros importados foram preservados: 139
ativos e 5 sem associação segura à edição explícita pedida. Manifest/mapping e
relatórios: `data/wishlist-artwork-*.json` e `src/data/wishlist-artwork.ts`.
Não há pedidos de artwork externo no browsing normal.

A identidade da capa inclui targetId, plataforma, título normalizado, região e
requisito de edição: edição conhecida, **Any** (sem requisito) ou **Unknown**
(edição nomeada mas não reconhecida). Loose/CIB não muda a identidade. Any não
rotula a imagem como Standard; mudar para Standard/original, Platinum ou outra
edição explícita invalida o mapping anterior. Matches ambíguos/rejeitados ficam
em fallback. Ver os detalhes e os cinco casos preservados em [PROJECT_STATE.md](PROJECT_STATE.md).

## Configuração local

Requisitos: Node.js **22.x**, npm e acesso autorizado a um Blob privado com uma
`library.json` válida já aprovisionada. O repositório não fornece uma biblioteca
pessoal em texto simples nem um modo demo para as páginas atuais.

```bash
npm ci
cp .env.example .env.local
# Preencher as variáveis abaixo antes de abrir a app.
npm run dev
```

Abre `http://localhost:3000`. Build local: `npm run build`; servir esse build:
`npm start`. Compilar não confirma que o Blob ou as credenciais de runtime estejam
configurados.

| Variável | Uso atual |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Credencial server-side do store Blob privado. `@vercel/blob` 2.6.1 lê-a implicitamente; é usada pela `library.json` e pelas fotos privadas das cópias. |
| `APP_PASSWORD` | Password do gate privado, validada no servidor; cookie HttpOnly, SameSite=Lax e Secure em produção. Configura-a para proteger o deploy. Sem esta variável, o gate fica desativado; o runtime atual não impõe um erro de configuração por omissão. |
| `PRICECHARTING_CATALOG_GITHUB_TOKEN` | Opcional para browsing; necessário para preços. Token de leitura de Contents limitado ao repositório privado `mistercimba/vinted-retro-search`. |
| `PRICECHARTING_CATALOG_REF` | Opcional; branch/tag do snapshot de preços, por defeito `main`. |

Não são necessárias credenciais Google, IGDB ou RAWG para servir a app atual.
A ECB não requer uma chave no código. Não usar variáveis `NEXT_PUBLIC_*` para
credenciais, nem fazer commit de `.env.local`, tokens, chaves ou dumps privados.

Acesso local a um Blob de produção também permite writes reais através da app.
Usa um store de desenvolvimento separado e dados autorizados para testes de mutação.
O código não cria nem repõe uma biblioteca em falta automaticamente.

## Deploy na Vercel

1. Importar o repositório como projeto Next.js, com Node.js 22.x.
2. Configurar o acesso ao store **privado** e `BLOB_READ_WRITE_TOKEN` no servidor.
3. Confirmar que `retro-collection/library.json` existe nesse store e tem o schema
   esperado; não restaurar um snapshot antigo por omissão.
4. Configurar `APP_PASSWORD`; adicionar as variáveis PriceCharting se forem necessários preços.
5. Definir as variáveis para os ambientes efetivamente usados (Preview/Production).
   Um Preview que partilhe o Blob de produção pode alterar os mesmos dados.
6. Deixar a integração Vercel executar o build e verificar o deploy correspondente
   ao commit publicado.

Não é necessário mudar `next.config.ts` nem configurar APIs Google para este deploy.
Depois de configurar o runtime, `GET /api/health` deve devolver `ok: true`,
`provider: "library"` e `storage: "blob"`; uma falha de leitura devolve 503.
O gate usa uma única password, sem sistema de contas/multiutilizador.

## PWA e manutenção

O service worker guarda apenas a shell `/offline.html`, não páginas/API privadas.
Após uma sessão autenticada online, `/api/offline-snapshot` sincroniza uma lista
reduzida da Collection para `localStorage`. É uma consulta offline local e
potencialmente desatualizada, não uma cópia da biblioteca completa nem writes offline.

Ferramentas de manutenção existentes não são dependências do runtime nem um
roadmap de enrichment ativo:

- `npm run artwork:status`: verificação local de ficheiros da Collection.
- `npm run wishlist-artwork:import -- --input /tmp/wishlist-targets.json --report-only`:
  regenera os artefactos com um export temporário dos quatro campos autorizados
  (targetId, title, platform, targetVersion), sem consultar fontes/importar capas.
  Requer os assets existentes no checkout. Não commitar a wishlist completa.
- Os importadores de artwork e `npm run metadata:refresh` ficam disponíveis para
  manutenção explicitamente autorizada. Este último ainda usa Google/IGDB e,
  opcionalmente, RAWG; confirmar requisitos no próprio script antes de executar.
- `npm run collection:refresh` e os providers Google/mock/snapshot são ferramentas
  legadas para o snapshot encriptado; não atualizam a biblioteca Blob em runtime.

## Validação e estado do projeto

```bash
npm run check
python3 -m unittest discover -s scripts -p 'test_*.py'
```

`check` executa lint, Vitest e build. A CI em `.github/workflows/ci.yml` executa
estes checks e os testes Python. Não existe um check dedicado de documentação.

PRs [#26](https://github.com/mistercimba/retro-collection/pull/26) (biblioteca Blob),
[#27](https://github.com/mistercimba/retro-collection/pull/27) (UX) e
[#28](https://github.com/mistercimba/retro-collection/pull/28) (Wishlist artwork)
estão merged. Para o estado vivo e trabalho pendente, consultar
[PROJECT_STATE.md](PROJECT_STATE.md) e [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md).
Agentes devem começar por [AGENTS.md](AGENTS.md).