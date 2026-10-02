# Retro Collection — Estado e trabalho pendente

A arquitetura e o handoff atuais estão em [AGENTS.md](AGENTS.md) e
[PROJECT_STATE.md](PROJECT_STATE.md). Esta checklist distingue trabalho concluído
nos PRs merged de validação ainda pendente; não mantém as fases antigas de
Google/read-only como roadmap futuro.

O roadmap funcional/UX que nasceu da primeira revisão visual e de produto está
em [PRODUCT_UX_CHECKLIST.md](PRODUCT_UX_CHECKLIST.md). Esse ficheiro deve ser
atualizado à medida que as melhorias de produto são implementadas, adiadas ou
reavaliadas.

## Concluído

- [x] Next.js App Router, TypeScript, Tailwind e Node.js 22.
- [x] Dashboard, pesquisa rápida, filtros, ordenação e browsing por plataforma.
- [x] Collection/Wishlist com criação, edição e remoção de jogos.
- [x] Compra na Wishlist cria cópia na Collection e registo de compra.
- [x] Dados de compras e valuations persistidos na biblioteca; consulta na ficha e edição dos dados de compra.
- [x] Para vender/Vendidos e histórico das mutações da app (sem fabricar histórico passado).
- [x] Biblioteca da app em **private Vercel Blob** (`retro-collection/library.json`), sem seed/fallback automático para snapshots antigos.
- [x] Migração do runtime Google/read-only para biblioteca gerida pela app — [PR #26](https://github.com/mistercimba/retro-collection/pull/26) merged.
- [x] Contexto de lista/scroll ao regressar, navegação Collection/Wishlist, preço pela condição e estados de loading/indisponibilidade — [PR #27](https://github.com/mistercimba/retro-collection/pull/27) merged.
- [x] Metadata local/static: baseline aceite 454/495 (91,7%); 41 unresolved aceites.
- [x] Artwork Collection/plataformas servido localmente, com fallback quando não há match seguro.
- [x] Wishlist artwork local com identidade por requisito de edição — [PR #28](https://github.com/mistercimba/retro-collection/pull/28) merged.
- [x] Wishlist final: **139/298 (46,6%)**, 159 fallback; 144 ficheiros preservados, dos quais 5 sem associação segura à edição explícita.
- [x] Requisito de artwork distingue edição conhecida / Any / Unknown; Loose/CIB preserva identidade e alterações de edição invalidam o mapping anterior.
- [x] PriceCharting via snapshot GitHub privado, ECB FX e matching local por plataforma/título/edição/condição; falhas degradam para preço indisponível.
- [x] Gate por `APP_PASSWORD` e cookie HttpOnly; configuração explícita necessária para manter o deploy privado.
- [x] PWA com shell offline e snapshot reduzido da Collection sincronizado após autenticação online.
- [x] CI com lint, Vitest, testes Python e build; previews/deploys Vercel.
- [x] README e exemplo de ambiente reconciliados com os usos confirmados no código.

## Validação ainda pendente

- [ ] Terminar uma auditoria real em mobile/laptop: navegação, pesquisa, filtros, formulários e estados de loading/erro.
- [ ] Incluir nessa auditoria a consulta offline existente e a atualização do snapshot ao recuperar ligação. Não considerar este fluxo totalmente auditado.

## Manutenção opcional, separada

- [ ] Avaliar redução do tamanho das imagens da Wishlist, preservando identidade, qualidade e proveniência, apenas se essa tarefa for autorizada.

Não reabrir enrichment de metadata/artwork por omissão. Cobertura parcial e
fallbacks aceites não são automaticamente trabalho futuro. Google Sheets/PLAN
são contexto legado, não uma integração de produção por validar. CRUD, compras,
valuations e history já existem; não são fases futuras de uma app read-only.
Não acrescentar base de dados ou serviços apenas para substituir uma arquitetura
que já funciona. Novas funcionalidades exigem uma decisão própria de produto.
