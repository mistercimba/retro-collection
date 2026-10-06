# AGENTS.md — Retro Collection agent handoff

This file is the stable operating guide for any new agent/worker touching this repository.

Read this file **and `PROJECT_STATE.md` before making changes**. Read `ROADMAP.md` when choosing or planning future work. Then inspect the relevant code. Do not rely on old chat context or assume the README is current.

## Project

Repository: `mistercimba/retro-collection`

Private personal web app for managing Mário's physical retro-game collection and wishlist.

Primary goals:

- fast browsing of a large physical collection;
- trustworthy copy/purchase/value data;
- practical wishlist and buying decisions;
- pleasant "this is my collection" UI, not a generic admin panel;
- low operational complexity.

Tech:

- Next.js App Router
- TypeScript
- Tailwind
- Node 22
- Vercel
- private Vercel Blob
- Vitest

## Operating model — repository-first workflow

The repository is the canonical project memory. Chat history, Work sessions, local agent memory and external notes are disposable working context and must never be the source of truth.

Roles:

- **Mário = client / Product Owner.** He describes what he wants, reports problems, sets priorities and gives the explicit merge approval.
- **PM / intake agent.** Turns a request into a clear GitHub Issue, checks current state/roadmap, identifies real product ambiguities and keeps scope coherent.
- **Developer agent.** Implements one focused Issue on a branch, keeps changes scoped and opens a PR.
- **Tester / reviewer agent.** Validates the Issue acceptance criteria, regression risk, CI and preview behavior; it does not invent new scope.
- **Repository docs.** `AGENTS.md`, `PROJECT_STATE.md` and `ROADMAP.md` carry durable context between all of the above.

For substantial new work:

1. read `AGENTS.md` and `PROJECT_STATE.md`; read `ROADMAP.md` when prioritization/planning is involved;
2. inspect current `main`, relevant open Issues/PRs and the actual code before deciding what to do;
3. create or update a GitHub Issue **before implementation** so the request survives the current chat;
4. make the Issue self-contained: problem/goal, scope, acceptance criteria, constraints and useful evidence;
5. use a focused branch and PR tied to that Issue;
6. validate against the Issue, not against remembered chat wording;
7. wait for Mário's explicit approval before merging;
8. after merge, close/update the Issue and reconcile `PROJECT_STATE.md` / `ROADMAP.md` when the landed work changes them.

Preferred Issue lifecycle:

- `inbox` — captured, but not yet ready to build;
- `ready` — scope and acceptance criteria are clear;
- `in-progress` — implementation is active;
- `qa` — implementation is complete and being validated;
- `blocked` — cannot progress without a concrete dependency/decision;
- closed Issue — done, cancelled or superseded (state the reason).

Issue types are **Feature**, **Bug**, **UX** and **Audit**. Use the repository Issue Forms. An Audit is findings/recommendations by default; do not implement audit findings unless the user asks.

Tiny typo-only or mechanical maintenance may skip an Issue when no durable handoff is useful. Product behavior, bugs, UX changes, audits and any work likely to span agents/chats should not skip it.

## Source of truth

### Personal mutable data

The app is the source of truth for personal mutable data.

Structured library data lives in one **private Vercel Blob**:

`retro-collection/library.json`

Owned-copy photo bytes, when present, use the **same private Vercel Blob store**
under `retro-collection/copy-photos/<collectionId>/...`. The library JSON keeps
only the photo metadata/path; do not embed photo bytes in `library.json` and do
not introduce a second storage service for this feature.

Logical schema:

```ts
{
  schemaVersion: 1,
  updatedAt: string,
  collection: [],
  wishlist: [],
  purchases: [],
  valuations: [],
  componentNeeds: [],
  nextObjective: null,
  collectionLists: [],
  history: []
}
```

Important rules:

- Blob is required at runtime.
- Do **not** silently seed/rebuild a missing Blob from an old snapshot.
- Missing Blob should fail clearly rather than overwrite newer app-owned data.
- Old blobs without `history` are read as `history: []`.
- Old blobs without `collectionLists` are read as `collectionLists: []`; this remains schemaVersion 1 and backward-compatible.
- Old blobs without `componentNeeds` are read as `componentNeeds: []`; standard missing base parts can still be inferred from copy fields marked `No` without rewriting the Blob.
- Old blobs without `nextObjective` are read as `nextObjective: null`; this remains schemaVersion 1 and backward-compatible.
- Mutations are read-modify-write and intentionally simple for a single personal user.
- Do not add a database, queue, ETag system, state manager, etc. without an actual demonstrated need.

### Google Sheets

Google Sheets is **legacy/historical migration input**, not the current runtime source of truth.

The README documents the current Blob setup. Retained Google providers and refresh
scripts are legacy maintenance/recovery tools, not the normal app data path.

Do not:

- restore Google Sheets as runtime source;
- write to the old workbook;
- use old README statements to "correct" the current Blob architecture.

Historical sheet:
`Mario Retro Collection OS`

Legacy PLAN tabs contain an important semantic warning:

> PLAN = prioridade pessoal, não wishlist.

The migration nevertheless seeded app wishlist data from legacy PLAN targets. Do not silently reinterpret or delete those records. If wishlist semantics become relevant, surface the distinction explicitly.

## Library storage implementation

Main storage code is in:

- `src/lib/library-store.ts`
- `src/lib/library-actions.ts`
- `src/lib/owned-copy-photos.ts` for private physical-copy photo blobs
- `src/app/api/copy-photos/` for authenticated upload/read/delete routes

Expected behavior:

- reads from private Blob;
- writes back to private Blob;
- no automatic encrypted-snapshot runtime fallback;
- React `cache()` may be used for render/request read dedupe;
- mutation paths must not write from stale cached data.

The encrypted static snapshot may exist for emergency/manual recovery, but it is **not** the runtime library source.

## Current product behavior

Important routes/components include:

- Home/dashboard
- `/collection`
- `/want`
- `/platform/[slug]`
- `/game/[collectionId]`
- `/wish/[targetId]`
- `/lists`
- `/lists/[listId]`
- `/history`
- `/complete` — copy-specific missing-component queue

The app supports:

- console browsing;
- Collection/Wishlist tabs;
- live search/filter/sort;
- collection add/edit/remove;
- wishlist add/edit/remove;
- wishlist purchase -> Purchased/In transit -> receipt verification -> collection;
- purchase/valuation records;
- visible forward-only mutation history;
- private photos attached to individual physical copies;
- user-defined collection lists/goals with exact title+platform owned progress;
- local cover artwork;
- PriceCharting reference values;
- external reference links;
- a copy-specific **Para completar** queue for missing physical components.

History intentionally starts from the version that introduced it. Do not fabricate historical events unless explicitly asked.

## Navigation state

Recent UX work intentionally preserves platform-list context:

- tab;
- local search;
- filter;
- sort;
- scroll position when opening a detail and returning.

Do not regress this behavior.

Desktop/mobile navigation should treat:

- platform Collection -> Collection active;
- platform Wishlist -> Wishlist active;
- game detail -> Collection;
- wishlist detail -> Wishlist.

## Wishlist acquisition state

A wishlist target can be **Purchased / In transit** without being an owned Collection copy.

Rules:

- the target remains in `library.wishlist` while in transit, carrying optional `acquisition.state === "ordered"` linked to an existing `PurchaseRecord`;
- an ordered target is not an active shopping target and must not be shown as something to buy again;
- it does **not** count as owned and must not create a `CollectionGame` until receipt is explicitly confirmed;
- receipt uses the platform-aware physical checklist, creates the Collection copy, marks the purchase `received`, removes the target from Wishlist and records forward-only history;
- cancelling a purchase marks its PurchaseRecord `cancelled` and clears the target acquisition state so the target returns to its previous wishlist/PLAN semantics;
- direct Collection adds must not silently remove an in-transit target, because that could represent a separate physical copy;
- no carrier/shipping-tracking integration is implied;
- the global **Adicionar jogo** flow is the canonical entry point for choosing whether a catalog game is already owned, purchased/in transit, or only wanted;
- Wishlist purchase actions should reuse that same global acquisition dialog prefilled with the Wishlist target instead of maintaining a second purchase form.

## Next objective

The Home can show at most one manually confirmed **Próximo objetivo**.

Rules:

- persist only a reference to a real Wishlist target: targetId + exact title/platform + set timestamp;
- zero objectives is valid;
- only an active, not-yet-acquired and not-ordered Wishlist target can be selected;
- do not auto-pick or silently replace an objective;
- setting a different target explicitly replaces the previous one;
- purchasing the objective, removing its Wishlist target, or satisfying it through a direct Collection add clears it automatically;
- cancelling a purchase does not automatically restore the old objective;
- system suggestions may propose candidates later, but user confirmation remains required.

## Missing physical components / "Para completar"

Missing parts are not game Wishlist targets.

Rules:

- every need is tied to one concrete `collectionId`; never merge needs across duplicate copies;
- known base components come from the platform-aware physical profile (`media`, `box`, `manual` where applicable);
- a base field explicitly marked `No` can be shown immediately as an inferred need without mutating the Blob;
- default exception: NES, SNES, Nintendo 64, Game Boy, Game Boy Color and Game Boy Advance are loose-friendly for Mário; missing box/manual on those platforms must not auto-enter the active queue. A specific upgrade can still be tracked via an explicit custom need;
- persisted component workflow lives in `library.componentNeeds`, with active states `missing`, `found`, `purchased` and terminal states `received` / `closed`;
- marking a base component received updates that exact copy's physical field and recalculates its completeness;
- custom edition-specific needs (map, poster, disc 2, sleeve, insert, etc.) are added only from explicit user input; never infer special-edition contents;
- completed/closed component records remain for history; the active queue must not keep them visible;
- deleting a copy closes its active persisted component needs instead of silently leaving actionable orphan records;
- `/complete` is the aggregate queue and should support filtering by console/platform; the game detail is the authoritative place to edit that copy's physical checklist and custom needs.

## Multiple physical copies

Multiple copies are separate physical records, never one aggregate game record.

Rules:

- `collectionId` remains the copy identity;
- copy grouping uses only exact normalized **title + platform** identity, not fuzzy title matching;
- Collection and `Sell` records count as current physical copies; historical `Sold` records do not join an active copy group;
- purchase, condition, valuation and owned-copy photos remain independent per copy;
- do not propagate edits from one copy to another implicitly.

## Collection lists / goals

Lists are user-defined data, not hard-coded franchise logic.

Rules:

- a list contains explicit title + platform targets;
- progress counts only records with `keepStatus === "Collection"`;
- target ownership uses exact normalized title + platform identity, reusing the conservative copy identity normalization;
- no fuzzy matching or edition guessing;
- deleting a list/target never alters Collection or Wishlist records;
- duplicate title+platform targets inside the same list are ignored.

## Metadata

Game metadata is static/local at runtime.

Current accepted metadata baseline:

- 454 / 495 matched
- 91.7% coverage
- 41 unresolved accepted

Do **not** restart metadata enrichment or add IGDB/RAWG runtime calls unless specifically requested.

For app-added games, metadata lookup may fall back conservatively by title.

## Prices

Price architecture:

- PriceCharting data comes from a private GitHub snapshot;
- USD -> EUR may use ECB FX at runtime;
- price failures should degrade gracefully;
- do not describe the app as "zero network" globally.

Wishlist summary pricing must respect requested condition:

- loose target -> Loose price;
- CIB/complete target -> CIB;
- sealed/new target -> New;
- never silently present CIB as though it were Loose.

Loading and unavailable price states should remain distinguishable.

## Artwork

### Collection artwork

Collection artwork is local/static at runtime.

Relevant areas:

- `public/covers/`
- `public/covers/manifest.json`
- `src/data/game-artwork.ts`
- `data/artwork-games.json`
- artwork import scripts

The established philosophy is:

- exact/structured match over fuzzy matching;
- correct platform required;
- region/edition correctness matters;
- ambiguous -> unresolved;
- fallback is better than wrong artwork;
- no external artwork fetch during normal app browsing.

### Wishlist artwork

Wishlist artwork work is tracked in `PROJECT_STATE.md`.

When working on it, preserve these principles:

- dedicated local files first;
- safe Collection reuse second;
- visual fallback last;
- no external runtime artwork requests;
- wrong region/edition is a bug;
- visibly rejected source assets must stay blocked;
- import in small checkpointed batches.

Do not create a new GitHub Action just to import Wishlist artwork unless explicitly requested.

## UI/UX audit principles

A real production UI audit was performed on 2026-09-30.

When reviewing UI:

1. use the rendered app/browser first;
2. observe and reproduce;
3. only then inspect code;
4. distinguish bug vs UX issue vs visual preference;
5. avoid redesigning unrelated areas.

The desktop audit fixed several P1/P2 issues. Mobile/laptop audit is still incomplete; do not claim responsive layouts were fully verified.

## Data safety

This app contains real personal collection data.

Unless a task explicitly requests a mutation test:

- do not submit destructive forms in production;
- do not delete collection/wishlist records;
- do not mark wishlist items purchased;
- do not upload or delete owned-copy photos just for testing;
- do not alter prices/notes just for testing.

Use previews, pure tests, or read-only browser checks where possible.

Never expose credentials, tokens, private keys, passwords, Blob tokens, or private repository tokens in commits, logs, reports, screenshots, or chat responses.

## Git workflow

Default behavior for substantial changes:

1. inspect current `main`;
2. create/use a focused branch;
3. make minimal scoped changes;
4. run quality checks;
5. push;
6. open PR;
7. verify GitHub Actions and Vercel;
8. **do not merge unless the user explicitly approves merge**.

For long binary/import jobs, checkpoint to the remote branch every ~10-20 validated assets. Do not leave hours of work only in a temporary worker filesystem.

Keep commits coherent. Avoid dozens of tiny commits unless checkpointing a fragile import.

Remote pushes are an operational cost because they may trigger both GitHub Actions and Vercel. Before the first push for a normal code/UX change, batch the implementation, tests and durable documentation into one coherent candidate whenever practical. After a PR exists, prefer one new remote candidate per real feedback/fix round rather than pushing file-by-file.

## Quality checks

Before declaring code work complete:

```bash
npm run lint
npm run test
npm run build
```

If the task has Python importer tests, run those too.

Do not modify CI merely to hide a failing test.

Warnings already present may be reported separately; avoid creating new warnings without reason.

## CI / cost discipline

The owner wants low GitHub Actions / worker-credit usage.

- Do not repeatedly trigger CI without need.
- Do not create new automated workflows for maintenance tasks that can be manual.
- Avoid unnecessary deploy loops.
- Prefer local/worker validation before pushing when the available environment supports it.
- For normal work, aim for **one pushed QA candidate per feedback round**.
- Do not push a new commit only to record that the previous commit passed CI; record transient validation state in the PR/Issue instead. Fold durable docs into the candidate before pushing.
- GitHub CI intentionally runs on `pull_request` for feature branches and on `push` only for `main`; do not restore all-branch `push` CI without a demonstrated need.
- CI uses concurrency cancellation so a superseded run for the same PR/ref should be cancelled rather than consuming a full second run.
- Use remote checkpoints for expensive/fragile binary work where losing local progress is a larger risk than the extra run.

## Vercel

Vercel preview/production status can usually be verified from GitHub commit status.

Each feature-branch push can create a Vercel Preview. Preserve previews for meaningful QA, but control usage primarily by batching pushes. Do not disable Git deployments or add branch-ignore/deployment rules merely to save a build unless the owner explicitly agrees to that workflow change and there is a clear way to produce the final QA preview.

If direct Vercel tooling is unavailable/unauthorized, do not waste repeated attempts. Use GitHub status as the deployment signal and browser validation when available.

Protected previews may require app authentication. Do not interpret an auth page as an app failure.

## Engineering style

Prefer:

- simple;
- conservative;
- local/static;
- explicit;
- testable;
- reversible.

Avoid:

- speculative architecture;
- fuzzy matching that can corrupt data;
- hidden fallbacks;
- broad refactors during focused bug fixes;
- new dependencies without clear value;
- "while I'm here" redesigns.

If a task is an audit, audit first and do not implement unless asked.

## Documentation

`ROADMAP.md` is the single source of truth for pending/planned/deferred work. Do not create parallel roadmap/checklist files; update it instead.

`PROJECT_STATE.md` is the living handoff.

Update it when a change materially affects:

- current production architecture;
- active PR/branch;
- important known issues;
- major completed work;
- next recommended action.

Do not rewrite it for trivial CSS/text changes.

The README is the current onboarding/setup guide. `PROJECT_STATE.md` remains the
living handoff; verify the code and live repository state when documentation disagrees.

## Communication / final report

Be concrete.

For implementation tasks, report:

- branch;
- PR;
- commit(s);
- what changed;
- tests;
- GitHub Actions;
- Vercel;
- unresolved issues;
- whether anything was merged.

Do not claim visual validation if you did not actually open the rendered UI.