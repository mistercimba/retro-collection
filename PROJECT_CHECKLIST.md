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

- [x] CI GitHub Actions passou (lint, testes TypeScript, testes da política PAL e build) no merge commit `2dbe4b5`.
- [x] O check Vercel passou no commit final `2b30317`.
- [x] Artwork local completo: **516/516** jogos com capa, 0 em falta.
- [x] Capa regional do *The Hunt for Red October* substituída: manifesto marca PAL/NOE; o workflow importou o ficheiro atualizado no commit `2b30317`.
- [x] A auditoria das 493 capas de consolas não encontrou variantes não europeias nem registos sem evidência PAL/Europe. As capas PC podem usar arte `World`, porque não têm divisão PAL/NTSC.
- [ ] Confirmar em produção que os headers e totais correspondem à Google Sheet e que `provider: google` está ativo; as notas anteriores sobre o provider são contraditórias.

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
