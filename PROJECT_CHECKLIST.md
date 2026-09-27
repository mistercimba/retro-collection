# Retro Collection — Roadmap

## MVP — arquitetura e browsing

- [x] Next.js App Router + TypeScript + Tailwind.
- [x] Provider abstrato (`google` / `mock`).
- [x] Parser defensivo de `COLLECTION` e `AUDIT LOG`.
- [x] Join por `Collection ID`.
- [x] Dashboard mobile-first.
- [x] Pesquisa rápida para uso em lojas/feiras.
- [x] Coleção com filtros e ordenação.
- [x] Páginas de plataforma.
- [x] Página de detalhe do jogo.
- [x] Vista de itens para venda.
- [x] PWA básica.
- [x] Gate opcional com `APP_PASSWORD`.
- [x] Testes de parsing, EUR, join e slugs.
- [x] README com configuração Google/Vercel.

## Estado de validação

- [x] GitHub Actions passou (lint, testes e build de produção) no commit histórico `8fd3085`.
- [x] Vercel ficou **READY** no commit histórico `8fd3085`.
- [x] Artwork local completo no `main`: **516/516** jogos com capa, 0 em falta, conforme `data/artwork-missing.json` e `public/covers/manifest.json` no commit `2a3b3eb`.
- [ ] Revalidar o deploy atual: o check Vercel do commit `2a3b3eb` falhou por limite de builds (`build-rate-limit`).
- [ ] Confirmar o provider e os dados no deploy atual. Há documentação contraditória: confirmação histórica de `provider: google` via `/api/health` e uma indicação no README de modo mock/demo.

## Próximo — qualidade de dados e UX

- [ ] Confirmar em produção que os headers e totais correspondem à Google Sheet e que `provider: google` está ativo.
- [ ] Melhorar cache/offline para consulta em feiras com rede fraca.
- [ ] Criar favoritos / shortlist temporária sem escrever na sheet.
- [ ] Mostrar PLAN / buylist de forma read-only.

## Futuro

- [ ] Barcode scanning.
- [ ] Fotos das cópias físicas.
- [ ] Edição móvel e writes controlados para a source of truth.
- [ ] Histórico de preços e compras/vendas.
- [ ] Só considerar base de dados própria (ex. Postgres/Supabase) quando a sheet deixar de ser suficiente.
