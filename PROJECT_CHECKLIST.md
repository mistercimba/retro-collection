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

## Próximo — qualidade de dados e UX

- [ ] Ligar credenciais reais e validar todos os headers da sheet em produção.
- [ ] Adicionar capas através de uma fonte escolhida explicitamente (sem scraping aleatório).
- [ ] Melhorar cache/offline para consulta em feiras com rede fraca.
- [ ] Criar favoritos / shortlist temporária sem escrever na sheet.
- [ ] Mostrar PLAN / buylist de forma read-only.

## Futuro

- [ ] Barcode scanning.
- [ ] Fotos das cópias físicas.
- [ ] Edição móvel e writes controlados para a source of truth.
- [ ] Histórico de preços e compras/vendas.
- [ ] Só considerar base de dados própria (ex. Postgres/Supabase) quando a sheet deixar de ser suficiente.
