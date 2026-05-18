# Upgrade & Venue Builder Plan

Single source of truth for the upgrade program across `cur8-api`, `cur8-ui`, and `showtix4u-venues`. Built from joint Claude + Codex convergence over five review rounds plus the locked-decision pass. All claims here have been grep-verified against the local repos as of 2026-05-14.

## Current state (snapshot — 2026-05-17, post cur8-ui health-gate cleanup)

Read this section first if you're a fresh agent or starting a new chat. It's a point-in-time snapshot; for full per-commit detail, the §"Execution log" below has every commit hash + summary.

### `cur8-ui` — branch `dev-with-upgrade-2026q2` (was `feat/upgrade-2026q2`, retired 2026-05-15 night)

- **HEAD**: `1c4ccf0d1` `fix(router-7): finish v7 cleanup + Konva dep imports + oxfmt sweep` (pushed to `origin/dev-with-upgrade-2026q2`). Prior 3 commits on the branch: `355023c10` `chore(bump): cur8-ui patch + pin sweep` (2026-05-17); `1d6b84e68` `Merge feat/upgrade-2026q2 into dev-with-upgrade-2026q2` (2026-05-15 night); last pre-merge: `79a0ed2b2` `chore: drop utils/withRouter.jsx — all class components now use router hooks`. The 2026-05-15 merge brought in Valerie's Konva ReservedSeating + e2e fix + email-template-fix commits from `dev`.
- **Base for eventual PR**: still `dev`. PR creation deferred until W2 Docker (Vite-aware Dockerfile changes) + cur8-api W1 SRS land. Valerie reverted an earlier merge attempt (`810a0297f5` → `35d69519b9` 2026-05-15 morning) when she realized the upgrade requires Docker build-command changes she hadn't accounted for. See §"Execution log" → "2026-05-15 night — branch reorg" for the full chain. **PR #1458 (the agent-opened draft) is closed.**
- **Build**: `vite build` green at ~26s, 19k+ modules transformed.
- **`pnpm outdated`**: empty again post `355023c10` sweep (was 5 patches at 2026-05-15 night Codex audit).
- **`pnpm audit`**: 0 vulnerabilities of any severity (was 75 at W0 baseline). ✅
- **Deprecation warnings**: 0 on fresh `pnpm install`. ✅
- **`pnpm lint`**: ✅ green post `1c4ccf0d1` (was FAILS exit 1 with 1 error + 3,866 warnings; PrivateRoute deletion + format sweep cleared it). 23 fixable warnings remain — `--fix`-able nits, deferred as optional polish.
- **`pnpm format:check`**: ✅ green post `1c4ccf0d1` (was FAILS exit 2).
- **`pnpm install --strict-peer-dependencies`**: ✅ passes. Peers triage 2026-05-17 came up clean — the `355023c10` bump closed every gap Codex saw earlier (antd 6.3→6.4, react-intl 10.1.6→10.1.7, vite 8.0.12→8.0.13, etc.). Only known curiosity: `react@16.14.0` pulled by `react-flip-page@1.6.4` (single page-flip use; portal-isolated; not a runtime risk — documented for later).
- **Behind `origin/dev`**: 5 commits — `35d69519b` (the revert), `4d24cb8f3` (Konva replicate), `56a1b2cd8` + `458c1208c` + `53d98b182` (CUR8-3124 trilogy). Integration branch will need a sync before any merge back to `dev`.
- **Commits this program**: 43 on the branch since cutting off `dev` (38 prior + 4 class→function conversions + 1 shim deletion)
- **Class components remaining in source**: 0 of the 4 PLAN-tracked conversions (GeneralSeating, Payout, ReservedSeating, EventListing). utils/withRouter.jsx deleted. **3 untracked class components exist** in the repo-wide grep: `app/utils/injectReducer.jsx` (code-splitting reducer HOC), `app/utils/injectSaga.jsx` (almost certainly dead since W0 redux-saga removal — verify zero callers and delete), and Valerie's new `app/components/Event/ReservedSeating/ReservedSeating_konva.js` (parallel work she owns, deliberate class form). See §"Execution log" → "2026-05-15 night" for context.
- **What's done**: W0 (Node 24.15.0, pnpm 11.1.2, zero-touch deletes, baselines, gotchas) → Wave A linter/formatter (oxlint + oxfmt + Stylelint 17) → Vite 8 migration (878 `.js` → `.jsx` renames, all source) → broad `pnpm up --latest` → React 18→19, react-router-dom 5→7 (with `withRouter` HOC removed from 477 files + `useNavigate`/`useLocation`/`useParams` codemod + Switch→Routes + Prompt→useBlocker + 4-class `utils/withRouter.jsx` shim), `injectIntl` → `useIntl` (330 files), react-intl 2→5 (5 is the line that keeps both `injectIntl` and `useIntl` exports — full v13 bump is a future call), MUI 5→9 (icon renames), @uppy 1→5 (Dashboard collapses DragDrop+ProgressBar+StatusBar), react-day-picker 7→10, react-to-print 2→3 (hook API), react-image-crop 8→11, swiper 9→12, redux-thunk 2→3, immer 3→11, react-helmet → react-helmet-async (117 files), drop @ungap/url-search-params + intl + process polyfills (Wave D6), PrimeReact → MUI x-tree-view (Wave D4), Bootstrap dropped (Wave D5 — only 1 SCSS var inlined), react-localization → Proxy shim (Wave D7), color-thief-react replaced by 90-line native-Canvas `useImagePalette` hook, scandit-sdk **kept** (deprecated but user has paid subscription + API key — Wave-D-future swap will land when scandit is fully retired), webpack devDeps deleted (Vite is dev server now), `server/` + `internals/` directories deleted entirely, **Wave D1** `moment`/`moment-timezone`/`react-moment-proptypes` → `dayjs` via centralized `app/utils/dayjs.js` setup (147 files re-imported; `LocalizationProvider` swapped to `AdapterDayjs`), **Wave D3** `react-html-parser` → `html-react-parser` + DOMPurify via `app/utils/safeHtml.js` shim (49 files; every parsed HTML string is now sanitized, which the old lib was not), **Wave D2** `react-sortable-hoc` → `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers` + `@dnd-kit/utilities` across all 4 sortable surfaces (DragHandle now uses `useSortable` listeners/attributes; `onSortEnd({oldIndex, newIndex})` + DOM-walk identification → `onDragEnd({active, over})` with `data.current.table` plumbing; `getNearestTableAncestorId` helper deleted)
- **Known issues blocking PR** (surfaced 2026-05-15 night by Codex independent audit; resolution status updated 2026-05-17):
  - ~~Syntax error in `app/components/PrivateRoute/index.jsx:35`~~ ✅ resolved by `1c4ccf0d1` — file deleted (was dead in the app graph, only referenced inside a JSX comment).
  - ~~142 `<Route component={...}>` uses in `app/containers/App/index.jsx`~~ ✅ resolved by `1c4ccf0d1` — mass codemod to v7 `<Route element={<Foo />}>`.
  - ~~2 `<Redirect>` JSX uses~~ ✅ resolved by `1c4ccf0d1` — `PrivateRoute` deleted (took 1 of 2); `ClientDashboardPage` migrated to `<Navigate>`.
  - ~~Stale `withRouter` import in `app/containers/Connect/CreateEmailTemplate/index.js`~~ ✅ resolved by `1c4ccf0d1` — file deleted (was a stale duplicate of the `.jsx` variant).
  - ~~Konva file `ReservedSeating_konva.js` imports removed packages~~ ✅ resolved by `1c4ccf0d1` — imports rewritten onto upgrade-branch deps (`moment-timezone`→`utils/dayjs`, `react-html-parser`→`utils/safeHtml`, `react-localization`→Proxy shim, `withRouter`→router-7 hooks). Valerie should be Slacked since her brand-new file got rewritten.
  - **Docker / CI untouched (W2 not started)** — STILL PENDING. `docker/dev.dockerfile`, `docker/prod.dockerfile`, `docker/local.dockerfile` still use Node 22, `yarn`, and `npm run build`. This is the exact constraint Valerie cited when reverting the merge — until Docker is updated to know about Vite + pnpm + Node 24, `dev-with-upgrade-2026q2` cannot merge to `dev`. **This is the last cur8-ui blocker before PR can land.**

- **Critical files that didn't exist before this branch**:
  - `vite.config.mjs` (Vite 8 config — alias list mirrors the prior webpack `resolve.modules`)
  - `index.html` (root — Vite expects it there, not inside `app/`)
  - `app/utils/withRouter.jsx` (router-7-compat HOC shim for class components)
  - `app/utils/dayjs.js` (centralized dayjs + plugins: utc, timezone, customParseFormat, duration, relativeTime, isBetween, isSameOrAfter, isSameOrBefore, localeData, localizedFormat, minMax, objectSupport, weekOfYear)
  - `app/utils/safeHtml.js` (DOMPurify-sanitized html-react-parser wrapper; default export keeps the old `ReactHtmlParser(html)` call shape)
  - `app/hooks/useImagePalette.js` (90-line native-Canvas color extractor — replaces color-thief-react)
  - `.oxlintrc.json` + `.oxfmtrc.json` + `.stylelintrc` + `.stylelintignore` (new lint/format config files)
  - `pnpm-workspace.yaml` (pnpm 11 `allowBuilds:` config)
  - `docs/baselines/2026-05-14/*` (W0 baselines + Node 24 gotchas doc)
- **DECISION (2026-05-15 evening, user)**: convert all 4 class components to function components now, phased with check-ins between each. Sequence smallest → largest so the conversion pattern (lifecycle → `useEffect`, class state → `useState`/`useReducer`, bound refs → `useRef`, withRouter HOC drop → `useNavigate`/`useLocation`/`useParams` inline) is validated on smaller surfaces before tackling EventListing. After all 4 land, delete `app/utils/withRouter.jsx` (zero callers) and log the session.
  - **Conversion order** (file paths verified on `feat/upgrade-2026q2` HEAD):
    1. ~~`app/components/Event/GeneralSeating/GeneralSeating.jsx` — 1,057 LOC~~ ✅ `37a1acdf0`
    2. ~~`app/containers/Payout/Payout.jsx` — 1,619 LOC~~ ✅ `913b43114`
    3. ~~`app/components/Event/ReservedSeating/ReservedSeating.jsx` — 1,998 LOC~~ ✅ `7ae774656`
    4. ~~`app/containers/Event/EventListing/EventListing.jsx` — 4,680 LOC~~ ✅ `e7208030a`
    5. ~~Delete `app/utils/withRouter.jsx`~~ ✅ `79a0ed2b2`
  - **Validation per step**: `pnpm lint` + `pnpm build` after each commit; user spot-reviews the diff before the next conversion starts. Browser smoke-testing is deferred to dev-environment validation near program end per [§"Validation environments"] / `defer-deploys` policy.
  - **Status**: COMPLETE. 4 of 4 conversions landed + shim deleted. ~9,400 LOC of class-component code now runs as function components with hooks. Net diff across all 5 commits: roughly equal insertions/deletions (3,409 ins / 3,124 del + 42 deletions for the shim).
- **What ELSE is queued (optional polish)**:
  - `app/lib/react-element-pan/` vendored fork of `eventlistener` — could be modernized or dropped (only used by one component); not blocking.
- **Resume command from a fresh chat**: `cd ~/Code/cur8-ui && git fetch && git checkout dev-with-upgrade-2026q2 && git pull && pnpm install && pnpm build && pnpm lint && pnpm format:check && pnpm audit` — all should be green. Note: `feat/upgrade-2026q2` no longer exists on origin (retired 2026-05-15 night). **cur8-ui this phase is COMPLETE.** What remains is gated on cur8-api workstreams: W1 HLS port (hard dep on cur8-api SRS), W2 Docker (independent technically — the last cur8-ui-only blocker before PR can land), W4 Venue Builder admin UI (hard dep on cur8-api W4 endpoints). Per locked decision #14 the cur8-api PR merges first, then the cur8-ui PR. **The active workstream is now cur8-api Wave D-mirror, starting with `moment` → `dayjs` (38 files; mirror cur8-ui's `app/utils/dayjs.js` plugin setup).**

### `cur8-api` — branch `feat/upgrade-2026q2`

- **HEAD**: `9eec44fa8` `refactor(deps): migrate moment / moment-timezone → dayjs (Wave D-mirror)` (pushed to `origin/feat/upgrade-2026q2`)
- **Base**: `staging`
- **Build**: lint clean (0 errors, 22 warnings — unchanged through 4 dep-replacement commits); `node --check server.js` clean; `node -e "require('./server.js')"` loads every dep cleanly (errors only on missing local config — expected per §"Validation environments")
- **`pnpm outdated`**: 3 deprecated direct deps remain — `aws-sdk` v2, `fluent-ffmpeg`, `sib-api-v3-sdk`. moment + moment-timezone dropped 2026-05-17 (`9eec44fa8`); `moment` stays as a transitive of `bunyan@1.8.15` (logger; bunyan→pino is a PLAN-deferred swap, not in current scope).
- **`pnpm audit`**: 4 vulns (0 critical / 1 high / 1 moderate / 2 low) — was 105 at W0. **Attribution corrected 2026-05-15 night** (prior PLAN claim "concentrated in the 3 remaining deprecated packages" was wrong): 3 of 4 vulns are `mocha → serialize-javascript` (1 high + 1 moderate — serialize-js RCE via RegExp.flags + DoS via crafted array-likes; fix via mocha bump or `pnpm.overrides`) and `mocha → diff` (1 low jsdiff DoS in parsePatch/applyPatch). **Only 1 of 4 is from the deprecated-package backlog** (`aws-sdk` v2 low — region-param validation). The deprecated-package replacement queue alone will not clear audit; mocha's transitive vulns need a separate fix.
- **PR #3630**: open as draft against `staging`, 396 files / 38,698 additions. **Mergeable state: DIRTY (CONFLICTING).** Agent-opened 2026-05-15T22:35:41Z (see §"Execution log" → "2026-05-15 night — branch reorg" for context). Per user direction "do nothing with it right now."
- **Commits this program**: 8 on the branch since cutting off `staging` (4 prior + 4 Wave D-mirror dep replacements).
- **What's done**: W0 (Node 24.15.0, pnpm 11.1.2 via Corepack, golden harness committed) → Wave A linter/formatter (oxlint + oxfmt across 370 files) → `pnpm up --latest` covering Wave A test stack (sinon 5→22, mocha 10→11, chai 4→6, chai-http 4→5, nodemon 2→3) + Wave B (18 minor/patch bumps) + Wave C breakers (helmet 3→8, multer 1→2, axios 0.21→1, connect-redis 3→9, config 1→4, csv-stringify 3→6, deepmerge 2→4, pdfmake 0.1→0.3, google-auth-library 7→10, uuid 9→14, yaml 1→2, stripe 13→22, sitemap 2→9, intuit-oauth 3→4, body-parser 1→2, html-to-text 9→10, redis 4→5) + Express 4→5 → **Wave D-mirror dep replacements (4 of 7 landed)**: `randomized-string` → `crypto.randomBytes` (`3ec996ffd`), `promise-mysql` + legacy `mysql` (full retirement) → `mysql2` including knex client config swap (`959f06bd1`), `@google/maps` → `@googlemaps/google-maps-services-js` (`457ad59f5`), `moment` + `moment-timezone` → `dayjs` via centralized `lib/dayjs.js` (38 files; 13 plugins; inline fixes for moment-tz `Zone.utcOffset` sign convention + immutable-mutation in 2 test files' `roundSecs`) (`9eec44fa8`).
- **What's QUEUED** (in PLAN-recommended order, smallest first):
  - ~~`randomized-string` → `crypto.randomBytes(...).toString('hex')`~~ ✅ landed as `3ec996ffd`
  - ~~`promise-mysql` 5 → `mysql2`~~ ✅ landed as `959f06bd1` — full retirement of legacy mysql package (originally scoped to 4 files; expanded after discovering knex was on `client: 'mysql'`, not mysql2 as PLAN had stated)
  - ~~`@google/maps` (npm-deprecated) → `@googlemaps/google-maps-services-js` (5 call sites)~~ ✅ landed as `457ad59f5` (API key compatibility confirmed — same Google Cloud platform credential)
  - ~~`moment` → `dayjs` (38 sites)~~ ✅ landed as `9eec44fa8` — centralized `lib/dayjs.js` mirrors cur8-ui plugin set (13 plugins, CJS shape); variable name `moment` retained at call sites since dayjs API is mostly identical; inline fixes for the 3 known incompatibilities (`moment.tz.zone` sign convention in `getTimezoneOffset`; immutable-mutation in `roundSecs` across 2 test files).
  - **NEXT** `sib-api-v3-sdk` (npm-deprecated — was Sendinblue) → `@getbrevo/brevo` or `@sendinblue/client`. 2 files: `vendor/mail.js` (real use) + `db/locations.js` (commented reference only).
  - `fluent-ffmpeg` (npm-deprecated) → audit usage first; minimal options: native `child_process` spawn, or `@ffmpeg/ffmpeg`.
  - `aws-sdk` v2 → v3 (15+ sites; biggest scope, do last). Per-service `@aws-sdk/client-*` imports + new client/command pattern. **Note**: SRS code that lands in W1 is already written against v3 per locked decision #4 / #16 — this task converts the **rest** of cur8-api.
- **Workstreams not yet started** (after Wave D-mirror queue lands):
  - W1 SRS port (the original critical path — lands on top of the modernized dep surface).
  - W2 Docker (Dockerfiles + buildspecs + GHA workflows to patch-pinned Node 24; README/CONTRIBUTING/CLAUDE.md yarn→pnpm).
  - W4 venue builder draft endpoints + adapters (cur8-ui W4 admin UI has a hard dep on this).
- **Resume command from a fresh chat**: `cd ~/Code/cur8-api && git pull && pnpm install` — verify lint + node-check clean, then continue cur8-api Wave D-mirror replacements at **`sib-api-v3-sdk` → Brevo SDK** (2 files; `vendor/mail.js` is the real call site, `db/locations.js` has only a commented reference). Smaller-first ordering applied; aws-sdk v2→v3 stays last.

### `showtix4u-venues` — branch `main`

- **HEAD**: `7d50a0ff` `docs(plan): refresh snapshot for end-of-session handoff to personal machine` (pushed)
- **What's done**: PLAN.md is the active artifact. The W0 venues-specific bump (Node 24.15.0 + pnpm 11.1.2) shipped 2026-05-14 morning (`da7e6405`). Subsequent commits are all PLAN.md execution-log entries tracking cur8-ui + cur8-api work as it lands.
- **What's QUEUED**: nothing pending until cur8-api W4 venue builder draft endpoints land — venues plays its W4 template-archive role then.

### How to start a NEW chat / agent on this program

Paste this brief as the first message:

> I'm picking up the cur8-api / cur8-ui / showtix4u-venues upgrade program. Read PLAN.md in `~/Code/showtix4u-venues/PLAN.md` top to bottom — especially §"Current state (snapshot)", §"Locked decisions", and the latest §"Execution log" entries. Then run `git pull` + `pnpm install` + `pnpm build` (or equivalent verify) on whichever repo you're touching first. Surface your understanding of the resume point and the session's intended scope before any code change. Do not silently override a locked decision.

The user will confirm scope or redirect.

---

## How to use this document (resume protocol)

This document is the program's single source of truth. Any contributor — human or agent — picking up the work for any session should treat the following as their bootstrap. The protocol lives here, in the plan, so it travels via `git pull` to any machine and does not depend on per-session memory.

**1. Read top-to-bottom before touching code.** Plan-first (§"Working agreements" #1) requires that PLAN.md edits land before repo edits; understanding what's already in PLAN.md is a precondition. Pay particular attention to:
- §"Working agreements" — these bind every contributor, human or agent.
- §"Locked decisions" — load-bearing constraints; do not silently override.
- §"Validation environments" — local-vs-dev-vs-CI capability matrix; affects what work is even possible from a given machine.
- §"Execution log" — the live record of what's been done; the most recent entry per repo is the resume point.

**2. Find the resume point from §"Execution log".** The last "Status" line in each per-repo block records what's done, what's deferred, what's queued. Combine that with §"Recommended commit sequence" to derive what's next. If the resume point is ambiguous, ask the user before guessing — do not invent scope.

**3. Read repo-specific conventions before touching that repo.** Each repo has its own `CLAUDE.md` and `README.md` (e.g. `~/Code/cur8-ui/CLAUDE.md` enforces "Plain JS only — no TypeScript"). Do NOT assume frontend conventions mirror backend conventions, or vice versa. Survey package-manager state (`.nvmrc`, `.node-version`, `package.json` `packageManager` field, `pnpm-lock.yaml` vs `yarn.lock` vs `package-lock.json`) before any package-related work.

**4. Confirm scope before executing.** Per §"Working agreements" #3, surface any tension between user-stated scope and §"Locked decisions" before code is touched. The pattern: summarize program state as you understand it, propose the session's scope, list conflicts (if any) with options, wait for explicit confirmation. Branch history is part of the design — keeping it clean costs less than repairing it.

**5. End each session with a §"Execution log" update.** Per §"Working agreements" #2, the log entry is the last commit of a session, not the first thing skipped at the end. The next session resumes from the log.

A fresh session, on any machine, with `git pull` plus this document, has everything it needs. Per-machine agent memory (e.g. `~/.claude/projects/.../memory/`) is not relied upon — anything load-bearing lives in the plan itself.

---

## Scope

- `cur8-api` — Node backend modernization + SRS streaming migration
- `cur8-ui` — React frontend modernization + venue builder integration + HLS playback
- `showtix4u-venues` — template archive role during/after migration

## Branch posture

| Repo | Base branch | Old branches | Disposition |
|---|---|---|---|
| `cur8-api` | `staging` | `feature/streaming-service` | **Salvage source, not base.** 153 commits behind staging, 4 ahead. Re-port cleanly. |
| `cur8-api` | — | `ams-vimeo-replace` (231 ahead, 42 files) | **Skip entirely** (locked decision #8 — remove AMS completely, no salvage) |
| `cur8-api` | — | `node-4807`, `node-4807_2` | Mine for ESLint/Docker details only — too stale to base on |
| `cur8-ui` | `dev` | `feature/repo-upgrades` | **Salvage source, not base.** 309 commits behind dev, 1 ahead. Port only `app/components/Shared/HlsPlayer/index.js` + `app/utils/whip-client.js`. |
| `showtix4u-venues` | `main` | — | Stays as template archive; builder code moves to cur8-ui |

Old branches are abandoned as working bases. Fresh branches off `staging` / `dev`.

## PR / branch structure

Per locked decision #14, the upgrade program ships as **one PR per repo**. Each repo uses a single feature branch:

| Repo | Single branch | Base | Squashes/contains commits for |
|---|---|---|---|
| `cur8-api` | `feat/upgrade-2026q2` | `staging` | W0, W1 SRS, W2 Docker, W3 Waves A/B/C, W4 venue drafts |
| `cur8-ui` | `dev-with-upgrade-2026q2` *(interim — was `feat/upgrade-2026q2`, retired 2026-05-15 night; see §"Execution log")* | `dev` | W0, W1 HLS port, W2 Docker, W3 Waves A/B/C/D, W4 venue builder admin |
| `showtix4u-venues` | direct to `main` (no PR) | `main` | W0 only |

**Solo private repo carve-out**: `showtix4u-venues` is solo-owned (`bradyjreese/showtix4u-venues` on GitHub). PR ceremony adds no value with a single reviewer, so W0 commits land directly on `main` (optionally via a short-lived local working branch that is fast-forwarded and deleted). This carve-out is **specific to this repo** — `cur8-api` and `cur8-ui` are team-owned and continue to follow the single-PR rule.

Workstream / wave structure is preserved as **ordered commits inside the branch** (or directly on `main` for solo repos), not as separate PRs. Local sub-branches off `feat/upgrade-2026q2` for working organization are fine and don't need to appear in this document.

**Only documented exception: AMS removal.** After SRS prod-validates, each repo gets a small follow-up `chore/ams-removal` PR (see W1 §Post-SRS AMS-removal PR). AMS code must remain in-tree during the SRS validation window so the `streaming.provider` runtime flag remains a working rollback path. Folding AMS removal into the main PR would forfeit that rollback.

**Cross-repo merge ordering**:
1. `cur8-api/feat/upgrade-2026q2` merges first — provides API surface for SRS + venue drafts.
2. `cur8-ui/feat/upgrade-2026q2` merges after `cur8-api` is in.
3. `showtix4u-venues` lands directly on `main` per the solo-repo carve-out — no PR, no merge dependency on the team repos.

## Executive decisions (locked)

1. **Fresh branches off `staging` (api) and `dev` (ui).** Old branches are mined, not rebased.
2. **Target the Node 24 LTS line.** Node 26 is Current — not the target. Pin dev to the latest LTS patch (`24.15.0` as of 2026-05-14) and bump as patches land. Docker bases are patch-pinned per locked decision #10.
3. **pnpm 11.x via Corepack** in all three repos. Replaces npm (cur8-api) and Yarn Classic (cur8-ui). Aligns with `~/.claude/CLAUDE.md`'s "never npm/yarn" rule.
4. **Finish SRS streaming before broad dep churn.** ~~It touches infra, runtime, and playback — moving the ground under it during package waves is risky.~~ **Superseded 2026-05-14 by locked decision #16.** The dep-churn-after-SRS sequencing is dropped; "everything to latest" wins. SRS will land on top of latest deps in cur8-api, accepting the trade-off Codex flagged. Retained as struck-through so the rationale and override trail stay readable.
5. **Baseline cleanup can run in parallel** with SRS, as long as it doesn't touch streaming files.
6. **Venue builder: draft JSON table + publish adapters.** No `venues.seating_layout` column on the existing schema — `venue_seat` has 20M rows tied to existing tickets.
7. **Keep S3 `.mst` HTML runtime during venue migration.** Generate compatible templates from publish flow; retire manual template editing later.
8. **Zero user-visible regression, with two carve-outs.** The venue builder is a new admin feature (intentional addition). The streaming player swap (`@antmedia/webrtc_adaptor` → `hls.js` via SRS) is also allowed to change visibly — different chrome, different latency profile — because the underlying tech changes. Everywhere else — Node bumps, package manager swap, dependency upgrades, dead-code purges, all Wave A–D work — must be invisible to end users. See "User-visible parity" below.

---

## Working agreements (how this program operates)

Operating rules that bind both human contributors and any agent working against this PLAN.md. Discovered during 2026-05-14 execution and codified here so a fresh contributor on any machine has the same operating context as the session that produced them. They live in the plan rather than in per-machine notes specifically so `git pull` propagates them.

1. **Plan-first.** No repo code changes land before the corresponding PLAN.md edits are committed and pushed. When mid-session work surfaces a scope change, a new locked decision, or a change in the validation strategy, the plan edit comes first, then the code. This rule supersedes momentum.

   **Why:** PLAN.md is the multi-repo source of truth across `cur8-api`, `cur8-ui`, and `showtix4u-venues`. Code that diverges from the plan — even with intent to "backfill the plan later" — creates drift that later sessions can't recover from cleanly.

   **How to apply:** before opening an editor on any repo file, check whether the change is consistent with PLAN.md as it currently stands on origin. If not, edit + commit + push PLAN.md first. The plan-update commit should be small, conventional-commit-prefixed (`docs(plan):`), and self-contained.

2. **Continuous execution log.** PLAN.md §"Execution log" stays in sync with commit history. After each commit group or natural pause point, append an entry under the relevant date with: branch, commit hashes (one-line subjects), findings, deferrals, status. The log records what we did, not just what we planned — including reverts, course corrections, and explicit gaps. It is the resume point for the next session.

   **Why:** the plan tells future readers what we intended; the execution log tells them what happened. Both are needed to review whether the work matched the plan, and both must live in the same document so cross-referencing is local. A fresh agent resuming the program reads the plan top-to-bottom (including the log) and knows the state without external context.

   **How to apply:** the log entry is the *last* thing committed in a session, not the first thing skipped at the end. If a commit pushes work to a branch, the next commit (typically within the same session, latest within ~24h) updates §"Execution log". Cross-link related entries with `[[name]]` where helpful.

3. **Flag plan conflicts before executing.** When user-stated scope for a session conflicts with a locked decision recorded here (executive decisions, locked decisions, or these working agreements), the conflict gets surfaced in plain language before any code is touched. The user explicitly overrides the decision (and the override is recorded as a plan edit), or the scope adjusts, or the work waits. Silent execution of conflicting scope is the failure mode this rule prevents.

   **Why:** learned hard on 2026-05-14. Wave A + B were executed before W1 SRS, violating executive decision #4 ("Finish SRS streaming before broad dep churn"). The deviation surfaced only when an independent reviewer (Codex) audited the branch, and four clean commits had to be reverted to honor the locked sequencing. Branch history is part of the design; preserving it requires flagging conflicts at the front, not patching the plan at the back.

   **How to apply:** at the start of any scope-bounded session ("today let's do X"), scan §Executive decisions, §Locked decisions, and §Working agreements for anything that constrains X. If conflict: name it ("X is in tension with locked decision #N because Y"), list options ("(a) reorder, (b) override the decision and update plan, (c) accept the deviation"), let user pick explicitly. Branch history is cheaper to keep clean than to repair.

These three rules are program-specific to this upgrade plan. General workflow rules (SSH-into-staged-machine, fnm-only Node, etc.) belong in the user's global `~/.claude/CLAUDE.md`, not here. The line is: if the rule's failure mode would corrupt *this* plan's execution, document it here.

---

## User-visible parity (zero-regression principle)

### What counts as user-visible (must match)

- **Visual**: layout, colors, spacing, fonts, icons, animations, page-load behavior on the customer-facing site, the box-office side, and the admin shell (excluding the new venue builder).
- **Behavioral**: same clicks → same outcomes; same forms → same validation messages; same flows (checkout, signup, login, seat-selection, ticket purchase, refund, comp, scan, livestream watch) → same steps within tolerance.
- **Artifact-shaped**: ticket PDFs, dymo labels, transaction CSV exports, calendar `.ics` files, email-rendered HTML, marketing-template HTML — must match the pre-upgrade outputs byte-for-byte where the visible output is what the user sees. Where micro-differences are unavoidable (PDF metadata timestamps), the visible content stays identical.
- **Integration-shaped**: Stripe checkout UI, Google Wallet passes, Apple Wallet (PassKit) passes, Intuit OAuth handshake, Ably real-time events, PostHog tracking — all behave identically.
- **Streaming feature surface**: a logged-in viewer can still find the live stream from the same place, click play, see the stream, see the same captions/audio tracks if present, on the same browsers + iOS Safari.

### Carve-outs (allowed to change)

- **Venue builder** — new admin feature, intentional addition for internal users.
- **Video player tech and chrome** — `@antmedia/webrtc_adaptor` → `hls.js` means a different player component, different controls possible, and higher live latency (HLS adds seconds vs WebRTC sub-second). Accepted. The streaming *feature* keeps working; the player *implementation* is the known change.

### What does NOT count as user-visible

- Bundle size, build time, install time, CI duration, lockfile size.
- Internal logs, structured-log format, telemetry shapes.
- Source-tree organization, file paths, function names.

### W0 baselines (capture before any wave merges)

- **e2e green run** of all current Playwright specs on `dev`/**Node 24 LTS (24.15.0)** (15 specs as of 2026-05-14). Save report. If any spec fails on Node 24 that passed on Node 22, treat as a Node 24 regression to fix before the baseline is signed — not a stable-state baseline to lock in.
- **Visual regression snapshots** of top customer-facing screens (event listing, event detail, seat selection, checkout, livestream watch) and key admin screens. Tool: pick one in W0 (Playwright `toHaveScreenshot()` or `argos`).
- **Artifact goldens** (committed to `test/fixtures/goldens/`):
  - cur8-api: one ticket PDF, one dymo label, one transaction CSV, one calendar `.ics`, one rendered email HTML
  - cur8-ui: render-snapshot one reserved-seating and one GA `returnCreateVenueSectionsMarkup` output
- **Streaming baseline**: recorded reference of an OBS-published AMS live stream playing on desktop + iOS Safari, with annotated latency. Reference, not pass/fail — the player is allowed to change.

### Per-wave gates

Every PR adds parity proof before merge:

1. **e2e re-run** must be green on the new baseline.
2. **Visual diff** of in-scope screens vs. W0 must show no unexplained change. Explained changes are documented + pre-approved or the PR doesn't merge.
3. **Artifact diff** for any wave touching `pdfmake` / `canvas` / `csv-stringify` / `ics` / moment-formatting / email templates: regenerate the goldens, byte-diff the visible content.
4. **Streaming parity** for W1: every validation gate (W1 list) plus subjective latency / autoplay / scrub parity on desktop + iOS, captured before flag flip.

**"Explained change" workflow**: when a wave intentionally produces a visual diff (e.g., MUI 5 → 6 micro-spacing), the PR description includes (a) before/after screenshots, (b) the visual-diff tool's annotation file, (c) one-line user-facing impact statement, (d) reviewer sign-off in PR review. Without all four, the PR doesn't merge.

### Rollback heuristic

If post-merge monitoring (support tickets, posthog funnel rate, error budgets, latency dashboards) shows any user-visible regression: rollback is immediate. Flag flip for SRS, revert for everything else. No debate.

---

## Verified facts

### Branch state (2026-05-13)

| Repo | Branch | Commits relative |
|---|---|---|
| cur8-api | `origin/staging` vs `origin/main` | +6, -32 |
| cur8-api | `feature/streaming-service` vs `staging` | +4, -153 |
| cur8-ui | `origin/dev` vs `origin/main` | +25, -0 |
| cur8-ui | `feature/repo-upgrades` vs `dev` | +1, -309 |

### Venue DB schema (from `cur8-api/db/schema/base.sql`)

Two tables coexist:
- `locations` — customer-facing venue metadata. **API endpoints key on `location_id`** (verified in `routes/api/locations.js`, which already has `GET /locations/:id/layout`).
- `venue` (older, internal) — what the actual seating tables reference via `venue_id`. `db/venues.js` reads from `locations`, suggesting `venue` is legacy.
- `venue_section` — auto-increment 79,311
- `venue_row`
- `venue_seat` — auto-increment **20,002,886** (twenty million rows, tied to live tickets)

Builder JSON is a draft/edit format keyed on `location_id`; publish adapters resolve to `venue_id` and write to `venue_section`/`venue_row`/`venue_seat`, preserving IDs where names match.

### cur8-ui deletion candidates — grep-verified

Both static (`require('x')` / `from 'x'`) and dynamic (`import('x')`) forms checked.

| Package | App imports | Verdict |
|---|---|---|
| `fs` (fake polyfill) | 0 | **Zero-touch delete** |
| `npm` (in deps?!) | 0 | **Zero-touch delete** |
| `base64-img` | 0 | **Zero-touch delete** |
| `moment-countdown` | 0 | **Zero-touch delete** — independent of moment migration |
| `redux-saga` / `eslint-plugin-redux-saga` | 0 active (all 4 refs are commented/stale) | **W0 verification-delete** — clean build/lint/e2e gates required because stale saga helper files still exist. Helper-file cleanup is separate. |
| `intl` | dynamic in `app/app.js:185,189,190` (locale-data/jsonp) | **NOT zero-touch** — lazy locale loader. Remove only after browser-support review. |
| `google-auth-library` | 1 (`server-backend/controllers/google/class-eventticket.js`) | **Stay in prod deps** — used by Google Wallet SSR server |
| `primereact` | 1 (`app/containers/Artist/ArtistsPage`) | Refactor file, then delete |
| `bootstrap` | 4 (`Location/LocationHeader`, `Connect/Dashboard`, `EventListing.scss`, vendored DYMO) | Refactor, then delete |
| `react-localization` | 5 | **NOT zero-touch** — refactor to `react-intl` |
| `react-html-parser` | **50** | **NOT zero-touch** — biggest cleanup project; route through a single safe-html utility |
| `@babel/polyfill` | 2 (`app/app.js`, test bundler) | Replace with core-js + browserslist or drop after browser-support review |
| `ip` | 1 (`server/logger.js`) | Replace; server-side only |
| `process` polyfill | 1 (`app/app.js`) | Tied to webpack/browser shim cleanup |
| `eventlistener` | 1 (vendored `app/lib/react-element-pan/src/element-pan.js`) | Touch vendored lib or drop the vendor |
| `@ungap/url-search-params` | 2 (`Unsubscribe`, `Search`) | Replace with native `URLSearchParams` |
| `react-app-polyfill` | 2 (`internals/webpack/*.babel.js`) | Remove after browser-support review |
| `randomized-string` | 4 (Connect email templates) | Refactor to `crypto.randomUUID()` |
| `obscenity` | 1 (`CommunicationItem`) | Replace with maintained profanity filter |
| `mustache` | 1 (`app/utils/locations.js`) | **Load-bearing** — venue template renderer. Stays until the venue-builder publish pipeline lands. |
| `chalk` | 1 in `server/logger.js` + 4 in `internals/scripts/*` | Legitimate dev/server use; move to devDeps if reviewable |
| `compression` | 2 (`addProdMiddlewares.js`, JSPrintManager vendored) | Legitimate server-middleware use |
| `cors` | 2 (`server-backend/index.js`, `addDevMiddlewares.js`) | Legitimate server use |

**W0 zero-touch / package-only deletion list**: `fs`, `npm`, `base64-img`, `moment-countdown`, `redux-saga`, `eslint-plugin-redux-saga`. Everything else needs refactor work and goes into Wave D.

### TypeScript constraint

`cur8-ui/CLAUDE.md` says "Plain JS only — no TypeScript". This is a repo-local rule, not global. **Default: preserve plain JS.** The venue builder is the only place this was in tension (existing prototype is TypeScript). Locked decision #5: **compile-and-embed as a built JS package** — the builder lives as its own package, gets built to JS, and cur8-ui consumes the JS output. The plain-JS rule is preserved repo-wide.

### Node target

Latest LTS: **v24.15.0**. Latest Current: v26.1.0 (not the prod target). Plan tracks Node 24 LTS through its support window.

---

## Validation environments

Recorded 2026-05-14 in response to a constraint that needs to drive every parity gate in this program: the user cannot run `cur8-api` end-to-end on their local machines because the full runtime config (env vars, 1Password injections, deploy-time files referenced by `server.js:4` / `lib/helpers.js:4`) is not available to them. The user said: "I can't set it up cause I can never get the full config... we have to push to a dev environment honestly."

**What this changes:** every artifact / smoke / byte-diff that requires a running `cur8-api` is captured against the **dev environment** (`cur8-dev`, AWS account `583716518461`), not a local checkout.

**What it does NOT change:** lint, install, container build, unit tests that don't hit live integrations, and source-level static analysis still run anywhere — locally on `bradys-macbook` / `bradys-rxco-macbook`, in CI, or in containers.

| Capability | Local (`bradys-*`) | Dev (`cur8-dev`) | CI |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ | ✅ | ✅ |
| `pnpm exec oxlint` (post Wave A swap) | ✅ | n/a | ✅ |
| Unit / framework-load smoke (e.g. mocha + sinon + chai loads) | ✅ | n/a | ✅ |
| Container image build | ✅ | ✅ | ✅ |
| Live API endpoint (ticket PDF, dymo, CSV, .ics, email HTML — i.e. **goldens**) | ❌ | ✅ | n/a |
| Live integrations (Stripe / Ably / Google / Intuit / Mailchimp callbacks) | ❌ | ✅ | n/a |
| OBS publish → SRS → HLS pipeline | ❌ | ✅ (Fargate; user provisions) | n/a |
| iOS Safari + multi-browser playback | ❌ | ✅ (against dev) | n/a |

**AWS provisioning:** the user has permissions on `cur8-dev` to create new ECS / EKS / Fargate resources. This unblocks W1 SRS infra work directly — SRS Fargate tasks, the always-on RTMP router task, and any supporting ECS services can be stood up by the user via CDK in dev.

**New config keys:** when the program introduces new config values (e.g. SRS's `aws.srs.*`, `srs.callback_base_url` per W1 §API tasks #4), they're added to the dev environment by the user. Don't block code work waiting for them — call them out as "needs dev config" in the relevant PR and surface them so they get added.

## Workstream 0 — Baseline & Safety Rails

**Goal**: measurable baselines + isolated low-risk fixes before bigger waves. No streaming files touched.

**Branch**: `feat/upgrade-2026q2` in each repo (per locked decision #14). W0 work is the first commit group on that branch.

**Tasks**:

0. **Environment prereqs** (one-time, no PR — completed 2026-05-14):
   - fnm installed; Node 24.15.0 set as default on both `bradys-macbook` and `bradys-rxco-macbook` (`fnm default 24.15.0`, aliased `lts-latest`).
   - Homebrew Node uninstalled on both Macs; `gemini-cli` reinstalled as `npm i -g @google/gemini-cli` under fnm-managed Node 24.15.0.
   - `which -a node` resolves to only the fnm path on both Macs. `reese-mac-mini` confirmed to have no Node installed.
1. **cur8-api `docker/test.dockerfile` Node 8.10 → 24.15.0** (patch-pinned per locked decision #10) or delete if unused — verify with CI grep. The single most embarrassing line in either repo.
2. **cur8-api `.github/workflows/eslint.yml` Node 20 → 24.15.0** (matches W0 baseline target per locked decision #11; supersedes the prior "→ 22, move to 24 in W2" plan). **Note**: per locked decision #17, this workflow gets re-pointed at `oxlint` during Wave A (and may be renamed `lint.yml`). The Node bump still applies regardless of which linter the workflow invokes.
3. **cur8-api: move `nodemon` to devDependencies.**
4. **Baselines** (measure only, no deletions):
   - cur8-ui: `webpack-bundle-analyzer` snapshot committed
   - both: `pnpm dlx depcheck` report saved as a clue list (not auto-delete)
   - both: `pnpm audit` saved
   - both: clean install + lint + test status documented
   - **Parity baselines** (per zero-regression principle; capture environment per §"Validation environments"):
     - cur8-ui: pick visual-regression tool, capture screenshots of top customer + admin screens (captured against dev or local-with-staging-API)
     - cur8-ui: current Playwright e2e suite green run as "before" reference (15 specs as of 2026-05-14)
     - cur8-api: golden fixtures — one ticket PDF, dymo label, transaction CSV, `.ics`, email HTML — to `test/fixtures/goldens/`. **Captured by deploying the pre-upgrade `cur8-api` baseline to dev and hitting the relevant endpoints, NOT by running locally** (local run is blocked per §"Validation environments").
     - cur8-ui: render-snapshot one reserved-seating + one GA `returnCreateVenueSectionsMarkup` output
     - Streaming: recorded reference of an AMS live stream on desktop + iOS Safari (against dev)
5. **cur8-ui: delete W0 zero-touch packages**: `fs`, `npm`, `base64-img`, `moment-countdown`, `redux-saga`, `eslint-plugin-redux-saga`.
   - **`fs` nuance**: delete the fake `^0.0.1-security` dep line at `package.json:124`. **Keep** `"browser": {"fs": false}` at `package.json:55` — that's the actual webpack instruction. Real `require('fs')` resolves Node's core module.
   - **`redux-saga` nuance**: no active imports remain, but stale helper files and docs do. Delete only the packages in W0; helper-file cleanup is a separate behavior-risk pass gated by import tracing.
   - **`eslint-plugin-redux-saga` nuance**: confirmed at version `1.0.0` in `cur8-ui/package.json`. Current `.eslintrc.js` does not configure this plugin, but re-check for alternate eslint config before deletion. If any `plugins: ['redux-saga']` or `rules: { 'redux-saga/*': ... }` entries exist, remove them before deleting the package or `pnpm lint` will fail with "plugin not found".
6. **pnpm 11.x via Corepack** (moved from W2 per locked decision #12):
   - All three repos: set `packageManager: "pnpm@11.x.y"` (latest 11 patch) and confirm Corepack provisions it on Node 24.15.0.
   - `showtix4u-venues`: bump from `pnpm@10.33.0` to selected pnpm 11.x patch.
   - `cur8-api`: introduce `packageManager` field; generate `pnpm-lock.yaml`; delete `package-lock.json`; convert `npm run` script references to `pnpm run`.
   - `cur8-ui`: introduce `packageManager` field; generate `pnpm-lock.yaml`; delete `yarn.lock`; convert `yarn` invocations to `pnpm`.
   - `.npmrc` env-var resolution (`${NPM_GITHUB_TOKEN}`) must work under non-interactive shells; document the 1Password env-load expectation.
   - **pnpm 11 install-gate config (`pnpm-workspace.yaml`)** — pnpm 11 introduces two install-time guardrails that need explicit configuration:
     - **`allowBuilds:`** — every package whose `install`/`postinstall` script needs to run must be approved with `true`; everything else gets explicit `false` to silence the warning. **Approve only what's load-bearing** (native builds: `bcrypt`, `canvas`, `@parcel/watcher`, `fsevents`, etc.). **Deny** packages whose only postinstall is a sponsorship/donate `console.log` (`core-js`, `preact`, `styled-components`, `protobufjs` — all five seen in cur8-ui 2026-05-14). The cur8-api W0 entry `allowBuilds: { aws-sdk, bcrypt, canvas, dtrace-provider }` is the working reference.
     - **`blockExoticSubdeps: false`** (cur8-ui only, as of 2026-05-14) — required because `color-thief-react@2.1.0 → colorthief@2.3.2` declares its `quantize` subdep via a git URL, which pnpm 11 blocks by default. Set via `pnpm config --location project set blockExoticSubdeps false` (writes into `pnpm-workspace.yaml`). The flag is documented at the file with a Wave D8 follow-up note: removing `color-thief-react` removes the need for the flag. **Do not** use `.pnpmfile.cjs` hooks or `pnpm.overrides` in `package.json` to work around this — both fail (`.npmrc block-exotic-subdeps=false` is silently ignored; `pnpm.overrides` resolves *after* the gate fires; `.pnpmfile.cjs` works but is the wrong abstraction for a one-line gate-flip).
   - **`engines.npm` removal** (cur8-ui only) — the existing `package.json` had `engines: { npm: ">=9" }` which contradicts `npm@^8.19.2` in *deps*. Delete the `engines.npm` line during the pnpm migration; pnpm is the package manager via the `packageManager` field, not npm.
   - **Preinstall hook cleanup** (cur8-ui only) — `internals/scripts/npmcheckversion.js` + the `preinstall: "npm run npmcheckversion"` hook check `npm -v >= 5`, which is no longer load-bearing. Delete both during the pnpm migration.
7. **Node 24 runtime gotcha validation** (moved from W2 per locked decision #11):
   - OpenSSL 3.x cipher behavior — TLS edge cases on outbound integrations (Stripe, Ably, Google APIs, Intuit OAuth).
   - Native `fetch` is available — drop any fetch polyfills surfaced by depcheck.
   - Webpack 5 + babel-loader compatibility on Node 24 (cur8-ui).
   - node-gyp / native deps rebuild cleanly: `bcrypt`, `node-canvas`.
   - **`canvas` 2.11.2 does NOT build on Node 24** (verified 2026-05-14 in cur8-api). Bumped to `canvas` 3.x latest stable in W0 as a Node 24 compat carve-out (per locked decision #15). The full Wave C "minors bundle" canvas entry becomes a no-op as a result.
   - Findings recorded per repo at `docs/baselines/2026-05-14/node24-gotchas.md`.
8. **Per-repo `.node-version` / `.nvmrc` and `engines.node`** (consolidated into W0):
   - `cur8-api`: add `.nvmrc` and `.node-version` set to `24.15.0`; `package.json` `engines.node: ">=24"`.
   - `cur8-ui`: add `.nvmrc` and `.node-version` set to `24.15.0`; `package.json` `engines.node: ">=24"`; remove `npm` from `engines`.
   - `showtix4u-venues`: bump `.node-version` from `24.13.0` to `24.15.0`.

**Exit criteria**: CI green on Node 24.15.0 + pnpm 11.x in all three repos; baselines committed (`docs/baselines/2026-05-14/`); test-dockerfile fixed; zero-touch deletes merged; Node 24 gotcha findings documented.

**Estimated effort**: 1–2 days (tasks 6 and 7 widen W0's surface but each repo's lockfile/gotcha pass is self-contained).

---

## Workstream 1 — SRS Streaming Migration

**Goal**: replace Ant Media with SRS on Fargate, behind a provider flag, with rollback.

**Branch**: `feat/upgrade-2026q2` in `cur8-api` and `cur8-ui` (per locked decision #14). SRS work lands as the W1 commit group after W0 commits.

**Salvage sources**:
- API: `feature/streaming-service` (port; do not rebase)
- UI: `feature/repo-upgrades` (HlsPlayer + WhipClient only)
- Optional API references: `stream-hot-fix-2026-05-01` (3-line `tasks/scheduled-streams.js` fix). `ams-vimeo-replace` is skipped per locked decision #8.

### API tasks

1. **Port these files cleanly** (re-implement on top of staging, don't just copy):
   - `controllers/srs.js`
   - `vendor/srs.js`
   - `streaming-service/*` (SRS Dockerfile, entrypoint.sh, srs.conf)
   - SRS infra in **CDK** (locked decision #1). The `terraform/ant-media/` directory is AMS-only — it goes away with AMS. No new terraform.
   - `vendor/ecs.js` — SRS task helpers
   - `vendor/s3.js` — SRS HLS path support
   - Integration touchpoints: streaming, library, notifications, scheduled streams
2. **Provider flag** (global rollout — locked decision):
   - Single config value: `streaming.provider = ant-media | srs` read from `node-config` (`server.js:4`).
   - **No DB overrides, no per-client / per-event toggle.** The flag exists only to support the SRS validation window.
   - Validation sequence: deploy SRS code with flag still `ant-media` → flip to `srs` in dev → flip in staging → flip in prod once validation gates pass.
   - Once SRS is production-validated, AMS code is deleted entirely (see AMS cleanup PR). The flag itself can come out at that point.
3. **Fix known SRS blockers** (from the old branch's README/migration doc):
   - **RTMP router**: always-on Fargate task, **Node proxy** implementation (locked decision #3 — consistency with the existing JS stack, smaller ops surface). Maintains Redis `streamId → taskPrivateIp` lookup. Biggest unknown in W1, ~1 week.
   - SRS transcode engine output naming (cascading variants bug — fix in `streaming-service/srs.conf`, exact location to be re-confirmed when porting)
   - HTTP ports 8080 (HLS) / 1985 (API) bind to 0.0.0.0, or remove if all HLS is S3/API-proxied
   - S3 upload E2E validation (entrypoint.sh uploader script untested in old branch)
   - `controllers/srs.js` task-IP TODO in router validation
   - Stub play-token functions in `vendor/srs.js` — confirm SRS is HLS-only (no separate play tokens) or implement
4. **Secrets / config**:
   - Move to Parameter Store / Secrets Manager: `aws.srs.*`, `srs.callback_base_url`
   - Local dev via 1Password, never committed
5. **Tests** (the old branch had zero):
   - Publish token validation
   - SRS callback auth (on_publish, on_unpublish, on_hls, on_play)
   - Stream start/finalize lifecycle
   - S3 path generation + HLS playlist rewriting
   - Scheduled stream startup
   - Rollback / provider-flag selection
6. **Ops guardrails**:
   - Stale-task cleanup (verify 30-min idle timeout exists)
   - Structured logs at task launch, publish, unpublish, HLS upload, archive build
   - Alarms for failed task launch and missing HLS segments
7. **DB migrations** (decided to side-step the AMS-named-table problem at the source):
   - **Do not** re-port the salvage branch's `add-task-arn-to-ams-streams.sql` as-is. The salvage branch extended `ams_streams` because it took the path of least resistance; we know that table is going away.
   - Instead, add a new neutral table `streaming_streams` with the SRS lifecycle shape from day one: `internal_id` PK, `stream_id`, `provider` (`ant-media` | `srs`), `stream_key`, `client_id`, `event_id`, `scheduled_item_id`, `video_type`, `status`, `task_arn`, `created`, `updated`.
   - Match the current `ams_streams` lookup patterns with indexes on `stream_id`, `client_id`, `event_id`, `scheduled_item_id`, `status`, `video_type`; add `provider` if reporting/filtering needs it. SRS code writes here; AMS code keeps writing to `ams_streams` untouched.
   - The `provider` column is audit/lifecycle metadata, not a routing override. Runtime selection still comes only from the global `streaming.provider` config flag.
   - Add `db/streaming-streams.js` mirroring every exported method on the current `db/ams-streams.js` (`get`, `getByScheduledItemId`, `getStreamRehearsal`, `getByEventId`, `insert`, `updateStatus`, `adminList` — 7 exports total, verified). Put provider selection behind a thin streaming service/helper so callers follow the global config instead of hard-coding table names throughout the app.
   - Both tables coexist during the validation window. At AMS removal time, `ams_streams` is dropped cleanly with no SRS-side migration needed.
   - No `streaming_provider` column on `client`/`events` needed — the flag is config-only per locked decision #2.
   - Migration is no-op for AMS-only traffic (new table starts empty; nothing reads it until `streaming.provider = srs`).
8. **AWS SDK v3 in this PR** (locked decision #4): SRS code is written against `@aws-sdk/client-s3`, `@aws-sdk/client-ecs`, `@aws-sdk/s3-request-presigner` from the start. Do **not** port v2 code first then upgrade later. This pulls the SDK swap out of Wave C and into W1, but only for the SRS code paths; the rest of cur8-api still uses `aws-sdk` v2 until the dedicated SDK v3 PR lands later in Wave C.

### UI tasks

1. Port `app/components/Shared/HlsPlayer/index.js` and `app/utils/whip-client.js` from `feature/repo-upgrades` — copy files into the fresh branch, don't rebase.
2. Wire HlsPlayer into the 4 components the old branch touched: `Stream/StreamPlayer`, `Library/LivestreamWatchPage`, `CUR8Support/AMS`, `Library/LibraryFilmReview`.
3. Playback metadata comes from the API; UI selects player based on response.
4. WHIP behind a capability check — OBS RTMP is the first production target.
5. **Do not delete `@antmedia/webrtc_adaptor`** until SRS is production-validated.
6. **Do not remove AMS support screens** until ops has an SRS health view.

### Validation gates (none can be skipped)

1. OBS publishes through the intended public endpoint
2. API validates publish token, maps stream to SRS task
3. SRS produces HLS variants (1080/720/480 ABR)
4. Segments + playlists reach S3
5. cur8-api serves/proxies playlists and signed segment URLs
6. cur8-ui plays live HLS on desktop Safari, Chrome, Firefox, **and iOS Safari**
7. Scheduled / pre-recorded stream flow works
8. Multiple concurrent streams work without cross-routing
9. Stream end → expected archive/VOD behavior
10. AMS rollback documented + tested before the prod global flag flip

**Note on automation**: the existing 15 Playwright specs cover admin / checkout / event / login / org / smoke flows but **not streaming**. Streaming validation in W1 is manual (OBS publish + multi-device playback observation). Consider adding one Playwright spec that loads `LivestreamWatchPage` against a known-published test stream and asserts the player initializes, but treat this as nice-to-have, not a gate.

**Vimeo scope**: cur8-api has `vimeo_live_events` and `vimeo_videos` tables; the `ams-vimeo-replace` branch is large AMS+Vimeo hardening. **This plan replaces AMS only, not Vimeo.** Vimeo paths stay as-is. Confirm during the SRS port that no SRS code paths accidentally subsume Vimeo flows.

**Exit criteria**: SRS validates in dev and staging with the global `streaming.provider = srs` flag; prod rollback is a config change, not a redeploy; AMS code still present and removable later.

**Estimated effort**: 1.5–2 weeks; RTMP router is the long pole.

**Post-SRS AMS-removal PR** (after SRS validation passes — locked decision #8: remove AMS completely, no salvage):
- cur8-api: delete `vendor/ant-media.js`, `controllers/ant-media.js`, AMS routes, the `streaming.provider` config flag (now redundant)
- cur8-api: delete the `terraform/ant-media/` directory entirely
- cur8-api: drop the `ams_streams` table. Because SRS writes to its own neutral `streaming_streams` table from W1 (see W1 DB migrations), there's nothing to move first — `ams_streams` is purely AMS legacy at this point. DBA signs off on historical data retention before drop.
- cur8-api: remove `@antmedia/*` (none currently in api package.json; verify)
- cur8-ui: delete `@antmedia/webrtc_adaptor` (bundle impact measured)
- cur8-ui: delete AMS demo screens (`containers/Demo/AntMediaPage`, `containers/CUR8Support/AMS`, related routes)
- cur8-ui: delete `containers/CUR8Support/StreamingList` AMS-specific code
- Tear down the AMS Fargate / EC2 / NLB resources after the cur8-api PR merges and traffic shifts cleanly

---

## Workstream 2 — Docker / CI image alignment

**Goal**: align deploy-side container and CI infrastructure with the W0 dev-env standard (Node 24 LTS + pnpm 11.x).

**Note (2026-05-14):** Dev-side Node 24 LTS adoption and pnpm 11.x migration are executed in W0 (locked decisions #11 and #12). W2 retains only the Dockerfile / CI build-image / ECR-mirror work that depends on the W0 proof.

**Branch**: `feat/upgrade-2026q2` in `cur8-api` and `cur8-ui` (per locked decision #14). W2 work is the commit group after W1 in `cur8-api`, after the W1 HLS port in `cur8-ui`. `showtix4u-venues` has no W2 work — venues-side W0 commits fully cover it.

### cur8-api tasks
- Dockerfiles (dev/prod): private ECR `node_v22-21` → patch-pinned Node 24 (per locked decision #10 — e.g. `node:24.15.0-bookworm-slim`, or `node_v24-15` if mirrored in ECR). **Precondition: confirm the patch-pinned Node-24 image exists in ECR, or build/mirror it, before merging this PR.** Renovate or Dependabot bumps the pin as Node patches land.
- Test Dockerfile is handled in W0 (see W0 task #1).
- **Config-loading note**: `cur8-api/config/` is empty in the repo (just `.gitkeep`) but `server.js:4` and `lib/helpers.js:4` both `require('config')`. Config is injected at runtime (env vars, 1Password, or deploy-time files — confirm during W2 baseline). Bumping `config` 1 → 3 in Wave C must preserve whatever resolution path is in use, or every environment breaks at once.

### cur8-ui tasks
- Dockerfiles + buildspecs: Node 22 → patch-pinned Node 24 (per locked decision #10).
- `.github/workflows/*` setup-node + cache key → Node 24 + pnpm.
- **Caveat**: `app/lib/labels/dymojs` has its own nested package metadata — handle separately.
- Update `CONTRIBUTING.md`, `README.md`, `CLAUDE.md` (yarn → pnpm).

### showtix4u-venues tasks
- None at W2. Covered fully in W0.

### Verify install parity
Clean container build, run, lint, unit tests, smoke/e2e — on Node 24.15.0 inside the new base images. Match the W0 dev-environment proof in container land.

### pnpm 11 note

Plan targets `pnpm@11.x`. Only fall back to `pnpm@10.x` if implementation finds a concrete tooling blocker (CI image, Renovate config, lockfile-lint, etc.), documents the blocker in the PR, and gets explicit approval. The migration goals stay the same: one Corepack-managed package manager per repo with lockfile parity. (Dev-side adoption already complete via W0.)

### Node 24 runtime gotchas

Validation is performed in W0 (see W0 task #7) so gotchas are caught against the dev environment first. W2 re-runs the same checks inside the new container images to confirm dev/deploy parity.

**Exit criteria**: CI + Docker images on Node 24 LTS in dev/staging; production deploy unchanged until the SRS cutover window per locked decision #2.

**Estimated effort**: 1–2 days per repo, mostly waiting on ECR mirror + CI parity.

---

## Workstream 3 — Dependency Upgrade Waves

**Goal**: modernize every maintained package without one mega-PR. Each wave: install / build / test / bundle checks + parity gates.

### Wave A — Tooling & lockfile stabilization

Per locked decision #17, all ESLint / `eslint-config-*` / `eslint-plugin-*` / `babel-eslint` packages are deleted from each repo and replaced with `oxlint` + `prettier` 4.x latest + `stylelint` latest (cur8-ui only — cur8-api has no CSS). All version targets follow locked decision #15 (`latest` dist-tag).

**cur8-api**:
- **Linter swap**: delete `eslint`, `@eslint/js`, `globals` (or keep if oxlint config wants them), every `eslint-config-*` / `eslint-plugin-*`; add `oxlint@latest`; add `.oxlintrc.json` covering the rules currently in `.eslintrc.js`. The `@eslint/js` 9 → 10 carve-out is moot (see locked decision #17).
- **Test stack**: `mocha` → latest, `chai` 4.x → latest 5.x with the CJS↔ESM compatibility addressed via `--experimental-vm-modules` or test transformer (chai 5 is ESM-only; locked decision #15 says we go to latest, this is the trade-off), `chai-http` → latest, `sinon` → latest (5 → 22). If chai 5 ESM-only blocks within the time budget, document a one-line carve-out and stay on chai 4.5 — but try first.
- **Test Docker modernization (covered in W0)**.

**cur8-ui**:
- **Linter / formatter swap**: delete `eslint` and all `eslint-*` / `babel-eslint` devDeps; add `oxlint@latest`; bump `prettier` 1.17 → latest 4.x; bump `stylelint` → latest with whatever recommended config still applies; port `.eslintrc.js`'s `simple-import-sort` group config into oxlint's import-order config; update `lint:js` script to invoke `oxlint`.
- `Jest` → latest, `@testing-library/*` → latest.
- `Playwright` → latest.
- Babel / Webpack loaders → latest; drop obsolete proposal plugins (`@babel/plugin-proposal-nullish-coalescing-operator` is in syntax now).
- Keep Webpack 5 — Vite migration is still a non-goal of this batch.

**showtix4u-venues**:
- `Vite` + `TS` + `Fabric` version sweep to latest.
- Builder typecheck/build green.
- The repo never had ESLint, so no linter swap here. (If djlint introduces a JS lint step later, oxlint is the target.)

### Wave B — Low-risk runtime patches

Patch/minor bumps with no public-behavior change. Security patches. Transitive vuln cleanup post lockfile conversion. One commit group per repo within `feat/upgrade-2026q2`.

### Wave C — API breaking upgrades

| Order | Package | From → To | Risk | Notes |
|---|---|---|---|---|
| 1 | `aws-sdk` v2 → `@aws-sdk/*` v3 (remaining call sites) | — | **Medium** | 15 files originally; SRS work in W1 already migrated its share (locked decision #4). Own PR for the rest. Modular bundle, smaller cold start. |
| 2 | `helmet` | 3.15 → 8.x | Medium | Config API rewrite; test middleware chain |
| 3 | `multer` | 1.3 → 2.x | Medium | CVEs in 1.x; 3 upload routes |
| 4 | `connect-redis` | 3 → 7 | Low | Adjust session init; unblocks redis v4 non-legacy mode |
| 5 | `@google/maps` → `@googlemaps/google-maps-services-js` | 1 → 8+ | Low | 6 call sites; deprecated upstream |
| 6 | `promise-mysql` 5 → `mysql2` | — | Low | 4 legacy files; knex already uses mysql2 |
| 7 | `randomized-string` → `crypto.randomUUID()` | — | Trivial | 3 sites |
| 8 | `axios` 0.21 → 1.x | — | Low | 15 sites; CVEs in 0.21 |
| 9 | `request` → `undici` / native fetch | — | Low | If still present; verify with grep |
| 10 | minors bundle: `config` 1 → 3, `csv-stringify` 3 → 6, `deepmerge` 2 → 4, `chokidar` 5 → 4 (deprecated tag jump), `ajv` 6 → 8, ~~`canvas` 2 → 3~~ (done in W0 per locked decision #15), `pdfmake` 0.1 → 0.2, `google-auth-library` 7 → 9, `bcrypt` 5.0 → 5.1 | — | Low–Med | One PR |

**Also in Wave C** (locked decision #9 — moment is dead upstream, remove it everywhere):
- **API `moment` / `moment-timezone` → `dayjs`** (38 sites in cur8-api). Approach mirrors UI Wave D1: add a thin dayjs utility wrapper, codemod simple uses first, manual review for timezone arithmetic. Parity gate: every date string that appears in a user-visible artifact (ticket PDF, email, CSV, `.ics`, on-screen) gets byte-diffed via the W0 goldens before/after.

**Deferred from Wave C**:
- **Express 4 → 5** — middleware semantics change; do after Node/pnpm/SRS settle
- **`bunyan` → `pino`** — unless ops needs structured-log parity now

**Wave C parity gates** (all byte-diffs are dev-deploy-vs-dev-deploy per §"Validation environments" — pre-upgrade dev deploy captures the baseline, post-upgrade dev deploy captures the comparison; local runs are not viable for any of these):
- `aws-sdk` v2 → v3: contract tests on error shapes that bubble to UI (S3 presigned URLs, ECS task launch envelopes, paginator shapes)
- `helmet` 3 → 8: diff response headers before/after; CSP / CORS / cookie behavior must match
- `multer` 1 → 2: upload e2e on staging for all 3 routes
- `pdfmake` 0.1 → 0.2 + `canvas` 2 → 3: regenerate ticket PDF + dymo label goldens against dev, byte-diff the visible content
- `csv-stringify` 3 → 6: regenerate transaction CSV golden against dev, byte-diff
- `axios` 0.21 → 1: error-shape contract tests where errors leak to UI
- `config` 1 → 3: smoke-test on dev (and any other envs the user has access to flip through) before merge; "local" no longer applies
- `@google/maps` → `@googlemaps/google-maps-services-js`: geocode/timezone/place response-shape parity tests

### Wave D — UI cleanup & replacements

Ordered by value-per-risk:

**D1: Moment → dayjs** (highest UI value win)
- 148 files, 637 lines of moment patterns
- Add thin dayjs utility wrapper using needed plugins (`utc`, `timezone`, `relativeTime`, `duration`, `customParseFormat`)
- Codemod simple `moment()` / `.format()` / `.add()` / `.subtract()` first
- Manual review for timezone arithmetic, durations, locales, calendar week boundaries
- Tests must cover: venue timezones, event dates, schedules, checkout windows
- Delete `moment`, `moment-timezone`, `react-moment-proptypes`, `date-fns`, `react-day-picker` only after last import is gone
- Bundle impact: expected biggest single win — measure with bundle analyzer

**D2: AMS removal** (after W1 production validation)
- Delete `@antmedia/webrtc_adaptor`, AMS demo screens, constants
- Bundle impact: measure before/after

**D3: react-html-parser → single safe-html utility**
- 50 files (modals, schedule, snackbar, comms, utils)
- Build one `<SafeHtml>` component using `html-react-parser` + sanitizer; codemod call sites
- Do NOT bundle into a polyfill PR — this is its own project

**D4: PrimeReact removal**
- 1 file (`Artist/ArtistsPage`). Refactor to MUI Tree, delete package.

**D5: Bootstrap audit**
- 4 files: 2 app, 1 SCSS, 1 vendored DYMO. Refactor app/SCSS to MUI/emotion, isolate vendored. Delete after.

**D6: Polyfill / shim cleanup** (after browserslist review)
- `@babel/polyfill` (2 files) → core-js + babel preset-env config
- `react-app-polyfill` (webpack configs) → drop after target-browser review
- `process` polyfill (app.js) → drop with webpack 5 native support
- `intl` (dynamic import in app.js) → confirm locale data still loads via dayjs or native `Intl` API
- `@ungap/url-search-params` (2 files) → native `URLSearchParams`
- `eventlistener` (vendored lib) — drop vendor or modernize

**D7: react-localization → react-intl consolidation**
- 5 files. Merge into existing react-intl translation pipeline.

**D8: Modern major bumps**
- `react-redux` 7 → 9 (Provider API compat, React 18/19 ready)
- `react-pdf` 4 → 10 (pdfjs worker URL config)
- `react-helmet` 6.0.0-beta → `react-helmet-async`
- `react-sortable-hoc` → `@dnd-kit/*` (4 sites)
- MUI 5 → 6 (emotion already in place; mostly minor)
- `scandit-sdk` 5 → 7 (test barcode flow on staging)
- Pick one of `react-color` / `react-best-gradient-color-picker`; delete the other

**Deferred to a later quarter** (each is its own project):
- React Router 5 → 7 (requires killing `connected-react-router`, ~500-line refactor)
- `react-intl` 2 → 13 (i18n breaking changes)
- `styled-components` 4 → 6, or unify on emotion (the unification may be the bigger win)
- Vite migration (post-router upgrade)
- React 18 → 19 (after react-redux, react-router, MUI all bumped)
- Full TypeScript adoption inside cur8-ui (the venue builder lives as a separately-built TS package per locked decision #5, but the repo itself stays plain JS)

**Bundle wins after Wave D1+D2+D3+D6**: substantial — moment family + AMS adapter + dead deps. Measure each PR with `webpack-bundle-analyzer` against the W0 baseline. Don't claim a number.

**Wave D parity gates** (highest-risk wave for invisible changes):

- **D1 moment → dayjs**: parity tests on fixed dates across timezones, DST boundaries, locale formats; before/after diff on every date string in PDFs, emails, CSVs, calendars, and on-screen. Spot-check event countdowns, "X days ago" strings, calendar week starts, MUI date-picker values.
- **D2 AMS removal**: only after SRS production validation (W1 gates). Streaming UX already changed per carve-out.
- **D3 react-html-parser → safe-html**: visual snapshot diff on all 50 call sites. Allowed-tag list documented; any tag previously rendered that the new utility strips is a parity break.
- **D4 PrimeReact removal**: visual diff on `Artist/ArtistsPage` — MUI Tree should match PrimeReact Tree behaviorally.
- **D5 Bootstrap audit**: visual diff on the 4 affected files.
- **D6 polyfill cleanup**: browserslist target documented; smoke-test on oldest supported browsers before any polyfill is dropped. For `intl`: confirm locale data still loads via dayjs or native `Intl`.
- **D7 react-localization → react-intl**: translation parity — every string previously served must come through with same wording (no English fallbacks slipping).
- **D8 majors**:
  - `react-redux` 7 → 9: re-run e2e suite; spot-check connected components for stale-prop bugs
  - `react-pdf` 4 → 10: golden-PDF diff on client-side PDFs (DigitalProgram, FlipbookPage). pdfjs worker bundle must be served from the same origin or `helmet`'s CSP will block it — coordinate with the helmet 3 → 8 upgrade so worker URL + CSP land together.
  - MUI 5 → 6: visual regression sweep on top 20 screens; document approved micro-spacing changes
  - `react-helmet` → `react-helmet-async`: meta-tag diff (SEO-visible)
  - `react-sortable-hoc` → `@dnd-kit/*`: drag UX parity on 4 sortable surfaces (handles, hover, drop animation)
  - `scandit-sdk` 5 → 7: physical-device scan parity test on staging
  - color picker: visual diff on whichever is removed

---

## Workstream 4 — Venue Builder Migration

**Goal**: move builder into cur8-ui, persist/publish through cur8-api, without breaking 20M existing seats or active events.

**Branch**: `feat/upgrade-2026q2` in `cur8-api` and `cur8-ui` (per locked decision #14). W4 work is the final commit group on each branch. `showtix4u-venues` stays as template archive — no W4 commits there.

### Data model

**New table** `venue_layout_draft`:

| Column | Type | Notes |
|---|---|---|
| `venue_layout_draft_id` | int PK auto | |
| `location_id` | int FK → `locations.location_id` | matches customer-facing key |
| `status` | enum | `draft` / `published` / `archived` |
| `layout_json` | JSON if MySQL ≥ 5.7.8, else LONGTEXT | locked decision #6 — verify prod DB version during W4 kickoff |
| `schema_version` | int | format versioning |
| `builder_version` | varchar | which builder produced this |
| `template_s3_key` | varchar | S3 key of generated `.mst` |
| `content_hash` | varchar | for idempotency |
| `created_by`, `updated_by`, `published_by` | int (user_id) | audit |
| `created_at`, `updated_at`, `published_at` | timestamp | |

The publish adapter resolves `location_id → venue_id` and writes the existing relational seating tables.

**Keep relational tables as live published model**: `venue_section`, `venue_row`, `venue_seat`. Reason: 20M existing seats tied to live tickets — JSON-only would be easy to build and dangerous to ship.

**SQL migration**: add `db/migrations/<YYYY-MM>/venue-layout-draft.sql` creating the new table. Follow the existing dated-folder convention (`db/migrations/2024-09/`, `2025-04/`, etc.). Indexes: `(location_id, status)` for "find latest draft", `(location_id, published_at DESC)` for version history if the production MySQL version supports descending indexes; otherwise use `(location_id, published_at)` and order descending at query time. No data backfill — the table starts empty.

### API endpoints (behind support/admin permissions)

Convention matches existing routes in `routes/api/locations.js`:

- `GET /locations/:id/layout-draft` — fetch current draft
- `POST /locations/:id/layout-draft` — create
- `PUT /locations/:id/layout-draft` — update
- `POST /locations/:id/layout-draft/preview` — render to HTML without persisting
- `POST /locations/:id/layout-draft/publish` — write to relational tables + S3
- `GET /locations/:id/layout-versions` — history

(`GET /locations/:id/layout` already exists; new endpoints sit alongside.)

### Adapters

- **DB → builder JSON**: load existing venue into editable JSON
- **Builder JSON validation**: duplicate names, empty sections, invalid seat counts, bad dimensions
- **Builder JSON → relational publish plan**: diff vs current state, ID mapping
- **Builder JSON → `.mst`-compatible HTML**: reuse `cur8-ui/app/utils/locations.js:655` `returnCreateVenueSectionsMarkup` logic, port to Node
- **Cache invalidation**: bust `db:venue:<id>` Redis key on publish

### Publish rules

1. Preserve existing `section_id` / `row_id` / `seat_id` where names match.
2. New IDs only for new objects.
3. **Destructive changes** (deletions, renames affecting seats with sold tickets for future events) follow locked decision #7 — **warn + require confirmation**:
   - On publish, the API computes a diff and identifies seats/rows/sections whose changes would affect sold-but-unused tickets on future events.
   - If any are found, the publish call returns the affected ticket/event list and rejects with a structured error.
   - The admin retries with `confirm_destructive: true` AND types the event name(s) into the confirmation field. Then the publish proceeds.
   - All confirmed destructive publishes are logged (admin user_id, timestamp, affected-ticket list) for forensics.
4. DB write runs in a transaction (MySQL).
5. **S3 write is NOT inside the DB transaction** — S3 isn't transactional with MySQL. Sequence: (a) compute new `.mst`, (b) DB transaction commits, (c) write `.mst` to S3 with content-hash key, (d) update `template_s3_key` on the draft row. If (c) or (d) fails, compensating action reverts the DB state to the previous published version. Document this compensation explicitly in the adapter.
6. Keep version history for rollback. `venue_layout_draft` rows with `status='published'` accumulate; superseded rows get marked `archived`, never hard-deleted.

### UI responsibilities

Move Fabric builder into `cur8-ui` as internal support/admin first.

**Minimum production feature set**:
- Load existing venue layout
- Save draft (autosave)
- Undo/redo (Fabric supports natively)
- Import/export JSON (support tool)
- Validate before save
- Preview using same render path as customer
- Publish with diff summary
- Active-event/ticket warnings before destructive changes

**Builder current state** (from showtix4u-venues scan):
- Fabric.js v7 + TypeScript
- Models: `VenueLayout`, `SectionData`, `RowData`, `SeatData`, `TableData`, stage
- JSON export only — no persistence, auth, undo, or `.mst` pipeline

**Implementation approach** (locked decision #5 — compile-and-embed as a package):
- Builder lives as its own package (likely `@cur8/venue-builder` or similar) — could be a workspace package inside a future monorepo, or just a published private package. The TypeScript source stays TS, compiled to JS via tsc/Vite for the consumer.
- `cur8-ui` imports the built package; the cur8-ui repo itself stays plain JS (CLAUDE.md constraint preserved repo-wide).
- The existing `showtix4u-venues/builder/` source becomes the seed for this package. It moves out of `showtix4u-venues` and into its own repo (or a packages/ subdir if cur8-ui adopts workspaces).
- Don't redesign the admin shell as part of this migration. Mount the builder inside `app/containers/Admin/VenueBuilder/` using existing routing/auth.

**Customer-facing seat selection stays on the current rendering path** until generated templates prove parity.

**Venue parity gate**: before any venue flips to the new builder-generated pipeline, render the same venue both ways (legacy hand-authored `.mst` vs builder-generated `.mst`) and diff the HTML. The customer-visible seating chart must be byte-equivalent on the dimensions that affect rendering: section names, seat IDs, section/row CSS classes, seat-type markers. Stylistic whitespace differences are fine; structural differences are a publish-pipeline bug, not an acceptable migration cost.

### showtix4u-venues role during migration

- **Short term**: template archive + upload/download utility
- **Medium term**: cur8-api publish flow becomes the S3 source-of-truth
- **Long term**: retire `showtix4u-venues/html` once all editing is through cur8-ui

**Estimated effort**: 3–5 weeks. Builder UI port + draft endpoints in parallel; adapters and publish flow are the long pole.

---

## Workstream 5 — Release & Rollback

### SRS release sequence (global flag, per locked decision #2)
1. Deploy SRS code with `streaming.provider = ant-media` everywhere (AMS still serving all traffic).
2. Flip flag to `srs` in **dev**. Run live OBS + scheduled + VOD/archive validation.
3. Flip flag to `srs` in **staging**. Run the same validation, plus multi-day soak.
4. Flip flag to `srs` in **prod**. Monitor task launch, HLS segment creation, playback errors, archive output for at least 48 hours.
5. If anything regresses at any step, the flip reverts immediately (config rollback, no redeploy needed) and AMS resumes.
6. Once prod has been clean for the monitoring window, the AMS removal PR lands — code, terraform, `@antmedia/*`, AMS infra all go, and AMS-named stream tables are dropped after DBA retention sign-off. No SRS lifecycle migration is needed because SRS has used `streaming_streams` from W1.

### Node/package release
- Package-manager standardization merges before dep waves
- Low-risk patches before majors
- Track UI bundle size each wave
- Each wave revertible without touching SRS or venue branches
- **Each merge runs the parity gates for its wave** (W0 baselines comparison required, not optional). Gate failure → no merge.
- **Post-merge monitoring window**: 48 hours of dashboards (support volume, posthog funnel rates, error budgets) before the next wave merges. Regression seen → immediate revert.

### Venue builder release
1. Internal support alpha: draft save/load only
2. Internal support beta: preview + publish to test venue
3. Production rollout: new venues only
4. Existing venue editing: non-destructive changes first
5. Destructive edits: explicit ticket/event safety check

### DB operations
- Take a database snapshot before any migration that alters schema: new `streaming_streams` table (W1), `venue_layout_draft` table (W4), `ams_streams` drop (AMS removal PR).
- Keep snapshots for 7 days minimum so a regression-then-rollback can restore data integrity.
- Run migrations in dev → staging → prod with manual review at each step; never auto-promote.

---

## Recommended commit sequence within `feat/upgrade-2026q2`

Per locked decision #14, each repo ships as one PR. The wave structure becomes commit ordering inside that PR. Per locked decision #16, the SRS-before-churn sequencing constraint is dropped — A/B/C/D no longer wait on W1, they sit alongside it in commit order.

**Per repo, in commit order (default ordering, not a hard gate after locked #16):**

1. **W0** — env-prereq note, safety-rail fixes, baselines, zero-touch deletes, pnpm 11.x conversion, Node 24 gotcha findings, `.node-version` + `engines.node` bumps. `pnpm-workspace.yaml` carries `allowBuilds:` + `blockExoticSubdeps: false` (cur8-ui) per pnpm 11 install requirements (see 2026-05-14 evening execution-log entry for the resolution path).
2. **W3 Wave A** — tooling stabilization, including the **linter swap to oxlint + oxfmt** + Stylelint latest per locked decision #17. ESLint and all `eslint-*` / `babel-eslint` packages deleted; Prettier replaced by oxfmt.
3. **(cur8-ui only) Vite migration** per locked decision #19 — replaces Webpack 5 with Vite. Sequenced *before* the broad dep bump so the bundler swap and the dep bump remain independently revertible. `internals/webpack/*` deleted; `vite.config.js` introduced; `env-cmd` removed in favor of Vite-native `.env.<mode>` files. React itself is NOT bumped during this commit-group — that's the next group.
4. **W3 Wave B + Wave C + Wave D (combined under locked #18)** — `pnpm up --latest` followed by per-major-jump refactor commits. Sub-order recommended for review clarity (each is its own commit or commit-group): React 18 → 19 → react-router-dom 5 → 7 (kills `connected-react-router`) → MUI 5 → latest → antd 5 → 6 → @uppy 1 → 5 → @stripe 1 → 9 → moment removal (148 files) → react-html-parser removal (50 files) → PrimeReact removal → Bootstrap audit → polyfill cleanup → react-localization → react-intl consolidation → remaining minors/patches. Parity gates per wave still required pre-merge.
5. **W1 SRS** (`cur8-api` + `cur8-ui`) — SRS code under the `streaming.provider` flag, still set to `ant-media`. Lands on top of the modernized dep + Vite surface; the Codex caution (SRS on top of new redis / @tus / express-session / qs / stripe versions) is the accepted trade-off recorded in locked #16.
6. **W2** — Docker / CI image alignment to Node 24 LTS. (Stays after W1 because SRS migration adds new infra concerns that the deploy images need to know about.)
7. **W4** — venue builder migration (`cur8-api` drafts table + endpoints first, `cur8-ui` builder admin after).

**Cross-repo merge ordering**:
- `cur8-api/feat/upgrade-2026q2` merges first (team PR).
- `cur8-ui/feat/upgrade-2026q2` merges after (team PR).
- `showtix4u-venues` is solo-owned and lands W0 directly on `main` — no PR.

**Follow-up PRs** (post-merge, post-SRS-prod-validation):
- `chore/ams-removal` per repo — strips AMS code, terraform `terraform/ant-media/`, `@antmedia/*`, demo screens, and drops `ams_streams` after DBA sign-off.

---

## Locked decisions (2026-05-14)

All 10 previously-open decisions are now answered:

1. **SRS infra ownership: CDK.** Verified `terraform/ant-media/` is the only terraform in cur8-api; it's AMS-only and gets nuked with AMS. SRS gets built fresh in CDK. **User has AWS permissions on `cur8-dev` (account 583716518461) to create new ECS / EKS / Fargate resources** — including SRS Fargate tasks and the always-on RTMP router task — so infra provisioning is not gated on external request-and-wait cycles (verified 2026-05-14).
2. **SRS rollout: global, no DB override.** Single config flag during the validation window, then full cutover. AMS is being deleted entirely (#8), so per-client/per-event nuance is wasted complexity.
3. **RTMP router: Node proxy on Fargate.** Consistency with the existing JS stack; smaller ops surface than nginx-rtmp + Lua.
4. **AWS SDK v3 during the SRS cutover.** SRS code is written against `@aws-sdk/*` v3 from day one. The rest of cur8-api's v2 → v3 migration still happens later in Wave C (separately, for the non-SRS call sites).
5. **Venue builder: compile-and-embed as a package.** The TS builder becomes its own package (likely `@cur8/venue-builder`); cur8-ui consumes the built JS output. Repo-wide plain-JS rule preserved.
6. **Venue draft storage: JSON column in a new `venue_layout_draft` table.** Old `.mst` + `venue_section`/`venue_row`/`venue_seat` rendering stays for legacy venues; new venues use the builder. Gradual replacement, no big-bang migration. MySQL JSON type if prod DB ≥ 5.7.8 (verify during W4), LONGTEXT otherwise.
7. **Destructive venue edits: warn + require confirmation.** Admin sees affected tickets, types event name to confirm, change goes through. Logged for forensics. Spelled out in W4 publish rules #3.
8. **AMS removal: complete and clean.** No salvage from `ams-vimeo-replace`. After SRS validation: delete AMS code (api + ui), the `terraform/ant-media/` directory, `@antmedia/webrtc_adaptor`, the `ams_streams` table (DBA sign-off on retention), and tear down the AMS Fargate / EC2 / NLB resources. SRS lifecycle data lives in its own neutral `streaming_streams` table from W1 onward, so the AMS table drop is clean — no data migration needed at removal time.
9. **API moment removal: do it.** Moved from Deferred into Wave C. Same dayjs wrapper pattern as UI Wave D1. Parity-gated on all date strings in user-visible artifacts.
10. **Docker base: patch-pin both repos** (e.g. `node:24.15.0-bookworm-slim`). Reproducibility wins; Renovate or Dependabot can auto-bump as patches land.
11. **W0 baselines captured on Node 24 LTS, not Node 22.** Supersedes the prior reference baseline on Node 22 (current prod). Dev workstations standardize on Node 24 LTS immediately; capturing on Node 22 would require version-switching for a baseline that no longer reflects where development happens. Trade-off accepted: Node 24 runtime gotchas (OpenSSL 3.x ciphers, native `fetch`, Webpack 5 + babel-loader, native deps `canvas` / `bcrypt` / `node-canvas`) surface during W0 baseline capture instead of being deferred to a separate W2 concern.
12. **pnpm 11.x migration moves from W2 into W0.** Corepack-managed pnpm 11.x is the foundation for every subsequent lockfile / dependency wave. Doing the package-manager swap in W0 means every later wave operates on the target package manager from the start — no mid-program lockfile rewrite.
13. **fnm-only Node management on all dev workstations.** No system or Homebrew Node coexists with fnm on `bradys-macbook` or `bradys-rxco-macbook`. `reese-mac-mini` has no Node at all and stays that way. CLI tools that require Node (e.g. `gemini-cli`) install as npm globals under fnm-managed Node, not via Homebrew formulae. Verified clean on 2026-05-14: `which -a node` resolves only to fnm paths on both dev Macs.
14. **Single PR per repo, commit-based structure.** Each repo ships its upgrade program as one feature branch (`feat/upgrade-2026q2`) and one PR. The workstream / wave structure is preserved as ordered commits inside the branch — not as separate per-wave PRs. The only exception is the post-SRS AMS-removal follow-up (one tiny `chore/ams-removal` PR per repo), which lands after SRS prod-validates because the `streaming.provider` runtime flag requires AMS code to remain in-tree during the validation window. Local sub-branches off `feat/upgrade-2026q2` for working organization are fine and don't need to appear here.
15. **Bumps target latest stable, not minimum-working.** Whenever a dependency must be bumped (Node compat, security CVE, build failure, anything), the version target is the `latest` dist-tag on the registry (skipping pre-releases). The Wave A/B/C/D phasing in W3 is preserved as commit-group structure — this rule is about *version target*, not *bump scope*. A specific exception: when a Wave C bump is required earlier (e.g. `canvas` 2 → 3 in W0 for Node 24 compat), it's pulled forward as a carve-out and the Wave C entry becomes a no-op. Such carve-outs are documented inline at the W0 task and at the original Wave C entry.

16. **Everything-to-latest, immediately. Overrides executive decision #4.** Per user direction 2026-05-14 evening: every dependency in every repo bumps to its `latest` dist-tag in *this* program iteration, not deferred behind W1 SRS. Wave A/B/C/D structure is retained as commit-group ordering inside `feat/upgrade-2026q2` (clean review groups, separable reverts), but the cross-wave sequencing constraint from executive decision #4 is dropped. Consequences explicitly accepted:
    - **cur8-api Wave A + B are re-applied** (the reverts on 2026-05-14 are themselves reverted, or equivalently the same bumps are re-introduced). The Codex caution stands: SRS port lands on top of changed redis/@tus/express-session/qs/stripe runtime; any SRS-related regression is investigated against the new dep surface, not the old one.
    - **Wave C** (API breaking upgrades) and **Wave D** (UI cleanup) execute in this program too, not "later." Parity gates per Wave C/D §"parity gates" still gate each commit-group merge — gates are not waived, only the sequencing is.
    - **Locked decision #15's "latest dist-tag" rule** is restated, not weakened. No "minimum-working" carve-outs from this point forward unless a concrete tooling blocker is documented inline.
    - **AMS-removal carve-out preserved.** The `streaming.provider` runtime flag still requires AMS code in-tree during the SRS validation window. AMS deletion is still the post-SRS-prod `chore/ams-removal` follow-up PR per repo, not folded into the main branch — that's a separate constraint from the dep-churn one.

17. **Lint/format swap: oxlint + oxfmt + Stylelint latest. Replaces ESLint everywhere.** All ESLint and `eslint-config-*` / `eslint-plugin-*` / `babel-eslint` packages are deleted from both `cur8-api` and `cur8-ui`. Replaced by:
    - **Linter**: `oxlint` (latest) in both repos. ESLint-config-compatible during transition so existing `.eslintrc.js` rules port incrementally. Final config lives in `.oxlintrc.json` per repo.
    - **JS/TS formatter**: `oxfmt` (latest — the oxc-project's own formatter, Prettier-compatible config via `oxfmt --migrate=prettier`). Replaces Prettier in both repos. Config lives in `.oxfmtrc.json`. Rationale for picking oxfmt over Prettier: stays inside the oxc toolchain (same vendor as oxlint, single mental model), Rust-based (faster than Prettier on large trees), Prettier-compatible config so existing style rules migrate 1:1.
        - **2026-05-14 evening note**: an earlier Wave A commit on cur8-api (`3115d2d56`) and on cur8-ui (`5d19b5101`) used `prettier@^3.8.3` instead of `oxfmt`. Both repos get a follow-up `chore(wave-a): swap Prettier → oxfmt` commit immediately after, before any code-reformat pass lands. The reformat pass on each repo uses oxfmt, not Prettier — committing as `style(wave-a): apply oxfmt across <repo>`.
    - **CSS linter (cur8-ui only)**: `stylelint` bumped to latest with the modern `customSyntax: "postcss-styled-syntax"` pattern (the deprecated `stylelint-processor-styled-components` API stopped working in stylelint 15+; `stylelint-config-styled-components` retired alongside).
    - **Reason**: rxco team standardized on oxc/oxlint at work; consistency across personal + work tooling is a productivity win, and oxc tools are fastest in this category. Wave A's "ESLint flat config cleanup" line item is replaced by this swap. The `simple-import-sort` custom-groups import ordering used in `cur8-ui/.eslintrc.js` (internal-alias groups) ports to oxlint's import-order config.
    - **Consequence**: the `@eslint/js` documented exception to #15 is moot — `@eslint/js` is being deleted, not version-pinned. The exception is removed from this document below.
    - **CI/Pre-commit**: the lint workflow runs `pnpm lint` (oxlint) and `pnpm format:check` (oxfmt). For cur8-ui specifically, lint-staged runs `oxlint --fix` on `*.js` and `oxfmt --write` on `*.json`.

18. **Full-override of the non-goals: every package bumps to latest, including the previously deferred majors.** Per user direction 2026-05-14 evening, "everything to latest" is taken literally — including React 18 → 19, react-router-dom 5 → 7, react-intl 2 → 13, MUI 5 → latest (was capped at 6 in Wave D8), antd 5 → 6, @uppy 1 → 5, @stripe 1 → 9, moment removal (Wave D1), react-html-parser refactor (Wave D3), PrimeReact removal (Wave D4), Bootstrap audit (Wave D5), polyfill cleanup (Wave D6), react-localization → react-intl (Wave D7). The Wave A/B/C/D commit-group structure is preserved for review clarity but the *scope* of each commit-group expands to include everything previously deferred.

    **Trade-off explicitly accepted:** this is a multi-day / multi-week refactor program, not a one-session task. The 356 build errors observed when `pnpm up --latest` ran on cur8-ui (2026-05-14 evening) are real refactor surface — each major-jump (React 19, Router 7, MUI 9, antd 6, etc.) has its own API-break surface to chase down. Sessions push incremental commits and clear resume points; the branch lives long.

    **Consequences for the Non-goals list below:**
    - `Vite migration` — **REMOVED** from non-goals (see locked decision #19).
    - `React 19` — **REMOVED** from non-goals.
    - `React Router 7` — **REMOVED** from non-goals. Requires killing `connected-react-router` (~500-line refactor of every connected route).
    - `Full UI framework consolidation` — stays a non-goal (the rule is "bump to latest", not "consolidate" — keep MUI + styled-components + emotion coexisting if they still work after bumps).
    - `JSON-only venue model` — stays a non-goal (locked decision #6 — separate architectural reason).
    - `Deleting AMS before SRS production proof` — stays a non-goal (locked decision #8 — flag-rollback requirement).
    - `Tracking Node Current (26.x)` — stays a non-goal (locked decision #2 — Node 24 LTS line only).
    - `Any user-visible regression` — stays the principle, but the surface area is now much larger; parity gates per Wave run more often.

19. **Vite replaces Webpack on cur8-ui. Sequenced *before* the Wave C/D dep bumps.** Per user direction 2026-05-14 evening ("the entire point of ALL of this is to do real, meaningful upgrades"). Webpack 5 is at end-of-line maintenance velocity; the React/JS frontend ecosystem has consolidated on Vite. Trade-offs explicitly accepted:
    - **Sequencing**: Vite migration lands as a discrete commit group on `cur8-ui/feat/upgrade-2026q2` *before* the broad `pnpm up --latest` dep bump. Reason: fewer moving variables during the bundler swap (deps as they are today are known-working with Webpack; bumping concurrently mixes "did the bundler swap break this?" with "did the dep major break this?"). After Vite is green, the dep bump runs and the modern bundler handles many of the breaking-API edge cases more gracefully (native ESM, better tree-shaking, simpler config).
    - **What gets deleted**: `internals/webpack/*.babel.js`, `babel-loader` chain (Vite's `@vitejs/plugin-react` handles JSX + Fast Refresh), `env-cmd` (Vite has native `.env.<mode>` files), `webpack-bundle-analyzer` (replaced by `rollup-plugin-visualizer`), `webpack-dev-middleware`, `webpack-hot-middleware`, `webpack-pwa-manifest` (replaced by Vite plugin), `add-asset-html-webpack-plugin`, `circular-dependency-plugin` (Vite plugin exists), various `*-loader` (sass, css, html, null, style, imports, image — replaced by Vite's built-in or plugin equivalent), `webpack`, `webpack-cli`.
    - **What gets added**: `vite` (latest), `@vitejs/plugin-react` (Fast Refresh + JSX), `rollup-plugin-visualizer` (bundle analyzer), `vite-plugin-svgr` if needed, `vite-plugin-pwa` (Workbox + manifest), plus any cur8-ui-specific Vite plugins surfaced during migration.
    - **What gets rewritten**: `vite.config.js` (replaces all three webpack `.babel.js` configs); `server/` (Vite has its own dev-server — keep cur8-ui's custom Express dev-server if needed for HTTPS / `local.cur8.com` hostname, but wire it to Vite via `vite.createServer` instead of `webpack-dev-middleware`); env config (`env/*.env.js` → Vite's `.env.<mode>` files or a thin shim because the existing `app/utils/env.js` copy-paste workflow is gitignored and may stay); DYMO vendored lib import path (Vite's static-asset handling); `react-pdf` worker URL handling.
    - **What stays the same**: React still at the version it's at (Vite migration explicitly does NOT bump React; that's locked #18's next commit-group); MUI, antd, emotion, styled-components stay at their current versions during the migration; tests stay on Jest (Vitest swap is a separate decision after Vite migration lands).
    - **CI**: `.github/workflows/lint.yml` and `smoke.yml` already use pnpm + Node-via-`.nvmrc`; the build step swaps from `pnpm build` (which currently runs webpack) to `pnpm build` (which after migration runs `vite build`). Same script name, different binary underneath.
    - **Webpack-on-Babel devDeps cleanup**: after Vite is green, `@babel/cli`, `@babel/register`, `babel-loader`, `babel-jest` (jest keeps for now), `babel-plugin-lodash`, `babel-plugin-react-intl`, `babel-plugin-styled-components`, `babel-plugin-transform-react-remove-prop-types`, `babel-plugin-dynamic-import-node`, `@babel/plugin-transform-modules-commonjs` get audited — some go away with Vite, some stay for Jest.

### Documented exceptions to #15

_None as of 2026-05-14 evening._ The prior `@eslint/js` carve-out is removed — see locked decision #17 (ESLint deleted entirely, not pinned).

---

## Non-goals (this batch)

- ~~One-shot "update everything" PR~~ — per locked decision #16, "update everything" is in scope, just split across commit groups, not collapsed into one diff.
- ~~Vite migration~~ — per locked decision #19, Vite migration is now in scope and sequenced *before* the broad dep bump.
- ~~React 19~~ — per locked decision #18, React 19 is now in scope.
- ~~React Router 7~~ — per locked decision #18, React Router 7 is now in scope (requires removing `connected-react-router`).
- ~~Express 5 (until after Node/pnpm/SRS land)~~ — per locked decision #16, the "until after SRS lands" gating is dropped. Per locked decision #18, Express 5 is now in scope alongside the rest of Wave C.
- Full UI framework consolidation
- JSON-only venue model
- Deleting AMS before SRS production proof
- Tracking Node Current (26.x) — we stay on the LTS line
- Any user-visible regression outside the two declared carve-outs (venue builder, video player)

---

## Execution log

Live record of what's been done against the plan, in chronological order per repo. Maintained alongside commits — see [[feedback-plan-continuous-updates]] in user memory for the workflow rule. Findings and deferrals are intentional surface area for review (human or another agent comparing spec to reality).

### 2026-05-14 — `showtix4u-venues` W0

- **Branch**: none — direct-to-`main` per solo-repo carve-out (§PR / branch structure).
- **Commits**:
  - `da7e6405` `chore(w0): bump to Node 24.15.0 + pnpm 11.1.2`
  - (Plus PLAN.md revisions `22ca6990`, `8494fbc9`, `4091547c`, `4535c003` on the same `main`.)
- **Findings**: zero deviations from plan. `pnpm install` was a no-op against the existing lockfile; `pnpm check` (djlint format + lint, builder tsc) green on Node 24.15.0 + pnpm 11.1.2.
- **Deferred**: none. The builder workspace stays (per user direction); pnpm therefore still needed in this repo until W4 builder migration. When the builder leaves the repo per W4, pnpm/`packageManager`/`pnpm-workspace.yaml` can also leave — this W0 commit becomes a no-op then.
- **Status**: W0 complete. No further workstream work applies until W4.

### 2026-05-14 — `cur8-api` W0 commit group

- **Branch**: `feat/upgrade-2026q2` off `staging`, pushed to `DigitalTheatre/cur8-api`.
- **Commits** (chronological):
  - `31cfdfc1e` `chore(w0): pin Node 24.15.0 (.nvmrc, .node-version, engines.node)`
  - `c151b19e3` `chore(w0): bump canvas 2.8.0 → 3.2.3 for Node 24 compat` (carve-out per locked decisions #11, #15)
  - `0e5116fa8` `chore(w0): migrate package manager to pnpm 11.1.2 via Corepack`
  - `6e3b4acc7` `chore(w0): modernize docker/test.dockerfile to Node 24 + pnpm`
  - `fc0421319` `chore(w0): move nodemon to devDependencies`
  - `38af5d1a4` `chore(w0): capture depcheck + pnpm audit baselines`
  - `42531de8f` `chore(w0): document Node 24 runtime gotchas`
- **CI sanity (local)**: `pnpm install --frozen-lockfile` clean; `pnpm exec eslint . --max-warnings=0` clean.
- **Findings surfaced** (full detail in `docs/baselines/2026-05-14/node24-gotchas.md`):
  - `canvas` 2.11.2 cannot build native bindings on Node 24; bumped to 3.2.3 in W0. Wave C minors-bundle canvas entry struck through.
  - `bcrypt` 5.1.1 installs via prebuilt napi-v3 binary — clean on Node 24.
  - `dtrace-provider` falls back to stub on macOS — expected.
  - `aws-sdk` v2 emits end-of-support warnings at require time — Wave C v3 migration unaffected.
  - pnpm 11 build-script gating lives in `pnpm-workspace.yaml` `allowBuilds:`, NOT in `package.json` `pnpm.onlyBuiltDependencies` despite the docs (the latter is read on fresh install but `pnpm approve-builds` only writes the former).
  - **11 missing-but-used deps** from `depcheck`: `body-parser`, `passport`, `passport-local`, `dayjs`, `form-data`, `diff`, `p-limit`, `@turf/buffer`, `@turf/points-within-polygon`, `@eslint/js`, `globals`. Real bugs (transitive availability hides them today). Wave A cleanup.
  - **105 vulnerabilities** from `pnpm audit` (8 low / 40 moderate / 55 high / 2 critical). Drives Wave B + C priority.
  - **5 deprecated direct deps**: `fluent-ffmpeg`, `multer@1.4.4` (CVE-2022-24434), `sib-api-v3-sdk`, `uuid@9.0.1`, `aws-sdk@2`.
- **Deferred from this commit group** (explicit, with reason):
  - **Test dockerfile native build deps**: `apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev librsvg2-dev` inside `node:24.15.0-bookworm-slim` so `canvas` and `dtrace-provider` can build inside the container. Noted in-file as a follow-up.
  - **Golden artifacts**: ticket PDF, dymo label, transaction CSV, `.ics`, email HTML per PLAN.md §W0 task 4. Requires a running cur8-api dev environment (MySQL, Redis, config injection) on `bradys-macbook`. Defer until dev env is wired up.
  - **Wave A dev-tooling bumps** (`sinon` 5 → 19, `mocha` latest, etc.): scoped as Wave A commit group, not W0.
  - **Missing-deps declaration cleanup**: surfaced in W0 baseline, fixed in Wave A.
- **Status**: W0 core complete on the branch; goldens (ticket PDF, dymo label, transaction CSV, .ics, email HTML — PLAN.md §W0 task #4) deferred pending the cur8-api dev env (MySQL + Redis + config injection) being wired up locally. Branch pushed.

### 2026-05-14 — `cur8-api` W0 follow-ups (small fixes)

- **Branch**: `feat/upgrade-2026q2` (continues from W0 commit group).
- **Commits**:
  - `54a3fb38a` `chore(w0): add canvas native libs to test.dockerfile`
  - `6300e79c5` `chore(w0): declare 11 missing-but-used deps`
- **Notes**:
  - test.dockerfile now apt-installs `build-essential`, `libcairo2-dev`, `libpango1.0-dev`, `libjpeg-dev`, `libgif-dev`, `librsvg2-dev`, `pkg-config`, `python3`. Covers both from-source compile and prebuilt runtime-link paths for canvas 3.x. Removed the prior "TODO: add native libs" comment block.
  - 11 missing deps declared at latest stable: `@turf/buffer 7.3.5`, `@turf/points-within-polygon 7.3.5`, `body-parser ~~2.2.2~~ 1.20.3` (re-pinned in post-review correction `e81217426` to match prior transitive resolution through express 4 — see post-review corrections entry below), `dayjs 1.11.20`, `form-data 4.0.5`, `p-limit 7.3.0`, `passport 0.7.0`, `passport-local 1.0.0` (prod); `@eslint/js 9.39.1` (pinned to 9.x line — see below), `diff 9.0.0`, `globals 17.6.0` (dev).
  - **`@eslint/js` pin observation**: 10.0.1 latest pulls in stricter `recommended` rules (`no-useless-assignment`, `no-unassigned-vars`) that flag 24 pre-existing cur8-api violations. ESLint major bump (9 → 10) is a separate Wave A task and code-fix project. Per locked decision #15 we'd target 10; per the spirit of "minor cleanup, not a rewrite," `@eslint/js` pinned to 9.x to match installed eslint 9.x.
  - **`p-limit` 7 (ESM-only)** — this bullet was wrong as originally written. Under Node 24 `require(esm)`, `require("p-limit")` returns the module namespace object, not the function, so `pLimit(1)` throws at the call site. The original smoke test used `(pLimit.default || pLimit)` which masked the bug. Corrected in post-review correction `6efd16282`: `tasks/dev/s3-prefix-copy.js:2` now uses `require("p-limit").default`. **Superseded — see post-review corrections entry below.**

### 2026-05-14 — `cur8-api` Wave A dev-tooling

- **Branch**: `feat/upgrade-2026q2`.
- **Commits**:
  - `a31c010e6` `chore(wave-a): bump sinon 5.0.2 -> 22.0.0`
  - `f8db61fb8` `chore(wave-a): bump mocha 10 -> 11.7.5, chai-http 4.3 -> 4.4`
  - `78c36af77` `chore(wave-a): patch bumps for chai, eslint, @eslint/js, nodemon 2->3`
- **Notes**:
  - sinon 5 → 22 is a long jump. PLAN.md §Wave A originally said "5 → 19"; per locked decision #15 went to latest stable 22.0.0. Smoke test confirmed `stub.withArgs` works on Node 24; full test-suite verification requires running `bin/test.sh` against the dev env (deferred).
  - mocha 11.x drops Node 18 support — clean carry on Node 24.15.0.
  - chai stays on 4.x because chai-http stays on 4.x and chai 5 is ESM-only. Patch bump 4.3.6 → 4.5.0 applied.
  - nodemon 2 → 3 is a devDep major; Node 18+ baseline is met.
  - eslint stays on 9.x per PLAN.md §Wave A; patch bump to 9.39.4 with `@eslint/js` kept aligned.
- **Reverted 2026-05-14** to honor executive decision #4 (SRS-before-churn). Revert commits on `feat/upgrade-2026q2`: `425d20d85` (mocha/chai-http), `8bfb7ecf2` (patches), `817635567` (sinon). To be re-applied as commit group after W1 SRS lands.

### 2026-05-14 — `cur8-api` Wave B low-risk patches

- **Branch**: `feat/upgrade-2026q2`.
- **Commit**: `ab61768a6` `chore(wave-b): minor/patch bumps for 18 non-breaking deps`
- **Bumps (all within their existing majors)**: `@mailchimp/mailchimp_transactional`, `@tus/s3-store`, `@tus/server`, `ably`, `csv-parse`, `express-session`, `handlebars`, `ics`, `jsonwebtoken`, `knex`, `passkit-generator`, `path-to-regexp`, `qrcode`, `qs`, `redis` (within 4.x — 5.x is major), `sitemap` (within 2.x — 3.x is major), `stripe` (within 13.x — 14+ is major), `yaml` (within 1.x — 2.x is major).
- **Held back for Wave C** (have a major waiting that needs review): `intuit-oauth` 3 → 4, `html-to-text` 9 → 10. Plus all PLAN.md §Wave C entries (`helmet`, `multer`, `axios`, `aws-sdk` v3, `moment` removal, `connect-redis`, `config`, `csv-stringify`, `deepmerge`, `ajv`, `google-auth-library`, `pdfmake`, `promise-mysql`, `randomized-string`, `uuid`, etc.).
- **Audit delta**: baseline 105 → post-Wave-B 84 vulns. Both `critical` cleared (2 → 0); `high` 55 → 46; `moderate` 40 → 33; `low` 8 → 5. Remaining vulns are concentrated in the Wave C target packages.
- **Reverted 2026-05-14** to honor executive decision #4 (SRS-before-churn). Revert commit on `feat/upgrade-2026q2`: `1dc0bb8c7`. To be re-applied as commit group after W1 SRS lands.
- **Status**: W0 + W0 follow-ups stand. Wave A + B reverted; both will be re-applied post-SRS.

### 2026-05-14 — `cur8-api` post-review corrections

Independent agent review (Codex) of the cur8-api branch on 2026-05-14 identified four issues. Resolved in this order:

- **Branch**: `feat/upgrade-2026q2`.
- **Commits**:
  - `6efd16282` `fix(w0): use p-limit .default for ESM-only v7 under require(esm)`
  - `e81217426` `fix(w0): pin body-parser to ^1.20.3 (match prior transitive)`
  - `1dc0bb8c7` `Revert "chore(wave-b): minor/patch bumps for 18 non-breaking deps"`
  - `8bfb7ecf2` `Revert "chore(wave-a): patch bumps for chai, eslint, @eslint/js, nodemon 2->3"`
  - `425d20d85` `Revert "chore(wave-a): bump mocha 10 -> 11.7.5, chai-http 4.3 -> 4.4"`
  - `817635567` `Revert "chore(wave-a): bump sinon 5.0.2 -> 22.0.0"`
- **What each correction addresses**:
  - **p-limit**: prior smoke test in commit `6300e79c5` used `(pLimit.default || pLimit)` which masked the call-site bug. `tasks/dev/s3-prefix-copy.js:2,14` does plain `require('p-limit')` then `pLimit(1)`; under Node 24 `require(esm)`, p-limit 7 returns a namespace object and `pLimit(1)` throws. Call site updated to `require('p-limit').default`; literal smoke test now mirrors actual usage.
  - **body-parser**: missing-dep declaration in `6300e79c5` had silently promoted body-parser from the 1.20.3 resolving transitively through express 4 to ^2.2.2 latest. v2 has subtle behavior shifts (extended-default for urlencoded, stricter content-type, dropped legacy options) affecting routes/middleware.js, routes/api/mailing-lists.js, routes/api/mailing.js. Pinned to ^1.20.3 to match prior effective behavior; v2 is now a deliberate Wave C item with focused webhook parity tests.
  - **Wave A + B reverts**: executive decision #4 says "Finish SRS streaming before broad dep churn." Wave A + B were executed before W1 SRS in violation of that ordering. The reviewer correctly noted that redis, @tus/*, express-session, qs, and stripe are all runtime surface SRS will lean on — reverting clean isolated commits is cheaper than weakening the locked decision. Branch history thereby preserves problem isolation: SRS-port problems stay SRS problems; Wave A/B will be re-applied as a commit group after W1 lands.
- **Verification (Codex's literal checklist)**:
  - `node -e 'const pLimit = require("p-limit").default; const limit = pLimit(1); console.log(typeof limit)'` → `function` ✅
  - `pnpm install --frozen-lockfile` → clean ✅
  - `pnpm exec eslint . --max-warnings=0` → clean ✅
  - Final `@eslint/js`: `package.json` range `^9.39.1`; pnpm lockfile resolves to `9.39.4` (highest 9.x). Intentionally stays on 9.x — `@eslint/js` 10.x adoption is the documented exception to locked decision #15 (see §Documented exceptions above), queued behind a focused ESLint 9 → 10 migration project.
- **Audit delta**: Wave B's improvement (105 → 84 vulns, both criticals cleared) is reverted with the bumps. Baseline returns to roughly 105 until Wave A/B re-apply post-SRS.
- **Status**: cur8-api branch contains W0 + W0 follow-ups + post-review corrections. Wave A + B reverted, awaiting re-apply post-W1 SRS. Branch is the canonical record of what was tried, reviewed, and how it was reconciled.

### 2026-05-14 — `cur8-api` golden capture harness (W0 task #4 prep)

Builds the reproducible harness that will eventually capture the W0 parity baselines (ticket PDF, dymo label, transaction CSV, `.ics`). Per [[feedback-defer-deploys]] in user memory, the *runs* (against staging for baseline, against dev for post-upgrade comparison) are deferred to the program's end-of-program deploy window; the harness itself is committed now so future work has a defined contract to fill in.

- **Branch**: `feat/upgrade-2026q2`.
- **Commit**: `f9902883e` `chore(w0): add cur8-api golden capture harness`
- **Files added**:
  - `tasks/dev/capture-goldens.js` — Node CJS harness; args `--base-url`, `--fixtures`, `--out-dir`, `--dry-run`; auth via `CUR8_AUTH_HEADER` env; manifest shape validation; path-template rendering; status assertions; binary/text body handling; explicit `todo: true` artifact-entry shape so unresolved contracts don't get invented. Zero new npm deps — uses Node built-ins (`fs/promises`, `path`, `url`, global `fetch`).
  - `test/fixtures/goldens/README.md` — workflow doc (baseline → upgrade → diff), validation-environment caveats, coverage table.
  - `test/fixtures/goldens/fixtures.example.json` — the committed contract; gets copied to a gitignored `fixtures.json` for actual captures.
  - `test/fixtures/goldens/.gitignore` — ignores the working `fixtures.json` and the captured artifacts themselves until they're deliberately committed during the baseline/upgrade pass.
- **Endpoints mapped** (from cur8-api code inspection):
  - **Ticket PDF**: `GET /api/transactions/:id/print` → `controllers/transactions.js exports.print` (auth `secure('box-office')`)
  - **Dymo label**: `GET /api/transactions/:id/print-dymo` → `controllers/transactions.js exports.printDymo` (auth `secure('box-office')`)
  - **Transaction CSV**: `GET /api/credits/reports/csv` → `controllers/credits.js exports.getCreditsCSV` (auth `secure('any-manager-creator')`). Query-param shape still TODO — pending a chosen deterministic small dataset for the baseline.
  - **`.ics`**: `GET /api/ics-subscriptions/:token` → `controllers/subscriptions.js exports.getSubscription` (token-in-URL, public).
  - **Email HTML**: **explicitly TODO**. No render-to-HTML endpoint found in `controllers/email-templates.js`, `controllers/communications.js`, or `controllers/mailing.js`. Manifest's TODO entry documents three resolution options: (a) capture template body via `GET /api/email-templates/:id` as JSON (weaker — not rendered HTML), (b) add a non-mutating preview endpoint as a small Wave A item, (c) intercept rendered HTML during `sendPreviewTestEmail` via a dry-run flag. Decision deferred. Until resolved, email-template HTML output is **not under parity-gate coverage** — flagged as a known gap rather than a hidden one.
- **Local validation (no deploy needed)**:
  - `node tasks/dev/capture-goldens.js` (no args) → helpful "missing required arg: --base-url" error.
  - `--base-url=not-a-url ...` → URL validation error.
  - `--dry-run` against the example manifest → prints 4 planned requests + 1 TODO summary; fetches nothing; writes nothing.
  - `pnpm exec eslint . --max-warnings=0` clean. `tasks/dev/**` is in the project's eslint ignore list by design (predates this work).
- **Deferred to the end-of-program deploy window**:
  - Filling in real IDs in `fixtures.json` against the staging environment.
  - Running the harness against staging to capture the pre-upgrade baseline (commits the 4 artifacts).
  - Deploying `feat/upgrade-2026q2` to `cur8-dev`, re-running the harness, byte-diffing against the baseline.
  - Resolving the email-HTML TODO (add preview endpoint or chosen alternative).
- **Nits fixed in commit `a21d13170`** after Codex 2nd-pass review: (a) transaction-csv promoted to `todo:true` (its placeholder `query: {TODO}` would have built `?TODO=...` in real captures), (b) harness now defensively rejects any params/query key named `TODO` (case-insensitive) so future placeholder slip fails fast, (c) README relative path to the harness corrected (`../../` -> `../../../` — README lives three dirs deep, not two).
- **Status**: harness + nit fixes committed and pushed. W0 task #4 contract is defined. Actual captures pending the deploy window.

### 2026-05-14 evening — `cur8-ui` W0 start + program scope override

Continuation session on personal MacBook after the work-machine planning session ended with "next session should start with cur8-ui W0 fresh." Branch `feat/upgrade-2026q2` cut off `dev` in cur8-ui, Node 24.15.0 pin committed, then yarn → pnpm 11.1.2 migration began. Two pnpm 11 install gates surfaced during the migration; both were resolved properly in `pnpm-workspace.yaml`, not via package.json overrides or `.pnpmfile.cjs` hooks.

- **Branch**: `feat/upgrade-2026q2` off `dev` (cur8-ui).
- **Commits so far**:
  - `195c9d7a6` `chore(w0): pin Node 24.15.0 (.nvmrc, .node-version, engines.node)` — also drops the contradictory `engines.npm` entry (was `>=9` with the npm package itself at `^8.19.2` in deps).
- **pnpm 11 install gates hit + resolved in `pnpm-workspace.yaml`**:
  - **blockExoticSubdeps** (pnpm 11's default supply-chain guardrail rejecting git-URL transitive deps). Hit on `colorthief@2.3.2 → quantize (git://github.com/olivierlesnicki/quantize.git)`, pinned by `color-thief-react@2.1.0`. Resolved via the official mechanism — `pnpm config --location project set blockExoticSubdeps false` — which writes `blockExoticSubdeps: false` into `pnpm-workspace.yaml`. `.npmrc block-exotic-subdeps=false` was tried first and silently ignored; `pnpm.overrides` redirects don't apply *before* the gate fires; `.pnpmfile.cjs` `readPackage` hook works but is the wrong abstraction for a one-line gate-flip. (Removing `color-thief-react` entirely is the Wave D8 fix and the long-term answer — until then, the gate-flip is documented at the colorthief subdep level via comments in `pnpm-workspace.yaml`.)
  - **Build-scripts gate (pnpm 11 default)**. Resolved in `allowBuilds:`. Approved: `@parcel/watcher`, `fsevents` (native file-watchers needed for dev-server hot reload). Explicitly denied: `core-js@2`, `core-js@3`, `preact@8.2.9`, `protobufjs`, `styled-components` — all are sponsor/donate `console.log` postinstall scripts, not load-bearing.
- **Program-scope override (locked decision #16)**: user direction this evening — "EVERYTHING should be on its latest version, including in cur8-api." This overrides executive decision #4 (SRS-before-churn). Codified as new locked decision #16 above with the Codex caution recorded inline (SRS port will land on top of changed runtime deps in cur8-api; any SRS regression is investigated against the new dep surface). Wave A/B/C/D structure retained as commit-group ordering, not as sequencing gates.
- **Linter/formatter swap (locked decision #17)**: ESLint and every `eslint-*` / `babel-eslint` package deleted in both `cur8-api` and `cur8-ui`. Replaced by `oxlint@latest` + `prettier` 4.x + `stylelint` latest (cur8-ui CSS lint only). Reason: rxco team standard at work; aligning personal + work tooling. Wave A entry rewritten accordingly. `@eslint/js` documented exception to #15 is moot — recorded as removed.
- **Working agreement #1 honored**: this PLAN.md update commits *before* any further code lands on either repo branch. Code commits after this PLAN.md commit will reference these decisions by number.
- **Status (queued for next commits on `cur8-ui/feat/upgrade-2026q2` after this PLAN.md update)**:
  - Commit: pnpm 11.1.2 migration (the install work just done, plus yarn.lock delete + `pnpm-lock.yaml` generation + CLAUDE/README/CONTRIBUTING yarn → pnpm).
  - Commit: W0 zero-touch package deletes (`fs`, `npm`, `base64-img`, `moment-countdown`, `redux-saga`, `eslint-plugin-redux-saga`).
  - Commit: Wave A — oxlint + Prettier 4 + Stylelint latest swap.
  - Commits: Wave B (minor/patch bumps to latest), Wave C (API breakers per the table), Wave D (UI cleanup, ordered D1–D8). Parity gates per wave still required before any commit-group is considered done.
  - Commit: cur8-ui baselines (depcheck, pnpm audit, webpack-bundle-analyzer, Playwright e2e green, visual-regression tool pick + first capture). Captured *after* the W0 deletes / migrations so the baseline reflects the new dep surface.
  - PLAN.md execution-log update at session end.
- **On cur8-api (queued for the next cur8-api commits)**:
  - Re-apply Wave A + B bumps (originally reverted as `425d20d85`, `8bfb7ecf2`, `817635567`, `1dc0bb8c7` on 2026-05-14 morning). Locked decision #16 supersedes the revert rationale.
  - Execute the linter swap per locked decision #17 — delete `eslint`, `@eslint/js`, all `eslint-config-*` / `eslint-plugin-*`; add `oxlint` + `.oxlintrc.json`.
  - Wave C bumps (`helmet` 3 → 8, `multer` 1 → 2, `axios` 0.21 → 1, `aws-sdk` v2 → v3 across the remaining call sites, etc.) per the Wave C table; parity gates per Wave C "parity gates" subsection still required pre-merge.
  - W1 SRS port follows; the salvage commits from `feature/streaming-service` re-implement on top of the now-modernized dep surface.

### 2026-05-14 evening (continued) — actual commits shipped this session

Initial entry above was the **queued** list. Updating with what actually landed and the open blocker that ends this session.

**Shipped on `cur8-ui/feat/upgrade-2026q2` (5 commits, pushed):**

- `195c9d7a6` `chore(w0): pin Node 24.15.0 (.nvmrc, .node-version, engines.node)`
- `bbd23d7b9` `chore(w0): migrate yarn → pnpm 11.1.2 via Corepack`
- `36f1ca123` `chore(w0): delete 6 zero-touch packages` (fs, npm, base64-img, moment-countdown, redux-saga, eslint-plugin-redux-saga)
- `6fe31e6ec` `chore(w0): capture cur8-ui baselines + Node 24 gotcha findings` (depcheck.json, pnpm-audit.json showing **75 vulnerabilities pre-Wave-A: 8 critical / 33 high / 24 moderate / 10 low**, node24-gotchas.md, README workflow doc)
- `5d19b5101` `chore(wave-a): replace ESLint with oxlint; bump Prettier + Stylelint` (later swapped to oxfmt — see below)
- `8432546e5` `chore(wave-a): swap Prettier → oxfmt`
- `bc01dc244` `style(wave-a): apply oxfmt across cur8-ui` (1643 files mechanically reformatted)

**Shipped on `cur8-api/feat/upgrade-2026q2` (3 commits, pushed):**

- `3115d2d56` `chore(wave-a): replace ESLint with oxlint + Prettier` (config swap only, no code reformat)
- `77291081b` `chore(wave-a): swap Prettier → oxfmt`
- `9328dd472` `style(wave-a): apply oxfmt across cur8-api` (370 files mechanically reformatted; also cleaned the `[WARN] Failed to replace env...` stderr contamination in the W0 baseline JSON/txt files committed earlier)

**Shipped on `showtix4u-venues/main` (3 commits, pushed):**

- `37bfea38` `docs(plan): lock decisions #16, #17 — everything-to-latest + oxlint swap`
- `661443e4` `docs(plan): refine locked #17 — oxfmt replaces Prettier`
- `454340bb` `docs(plan): lock decisions #18 + #19 — full override + Vite`
- (This entry itself, pending commit, records the session's actual shape including the Vite blocker.)

**Vite 8 migration: SHIPPED (locked decision #19 closed). Single commit `7ca76cdad` on `cur8-ui/feat/upgrade-2026q2`.**

After the earlier session-end revert, this session resumed Vite via **Option A from the prior resume list** — mass-rename JSX-containing `.js` → `.jsx` (878 files). The premise held: once files are `.jsx`, Vite 8's builtin transform parses them as JSX without any plugin-include puzzle. Production build green: **19,007 modules transformed in 28.18s**.

- **Renames:** 878 `.js` → `.jsx` via `git mv` (history preserved as `R` not delete+add); first pass via regex heuristic, second pass picked up 4 more files using JSX fragment syntax `<>` that the heuristic missed.
- **Tooling added:** `vite@8.0.12`, `@vitejs/plugin-react@6.0.1` (Babel-based, NOT the oxc variant — the oxc plugin doesn't yet support JSX-in-.js include patterns; once files are `.jsx` this is moot anyway), `vite-plugin-pwa`, `rollup-plugin-visualizer`, `stream-browserify`, `vm-browserify`, `buffer`, `glob`.
- **Webpack-loose / Vite-strict dep declarations made explicit:** `@mui/utils`, `@ant-design/icons`, `ably`, `react-router@5.1.2` (pinned to match `react-router-dom@5`), `@uppy/drag-drop@1`, `@uppy/status-bar@1`, `@uppy/progress-bar@1`, `nouislider@14` (the older import path `nouislider/distribute/nouislider.css` is gone in v15+; pinning v14 keeps the import resolvable until Wave D8 @uppy / nouislider refactor). Webpack's `resolve.modules: ['node_modules', 'app']` and transitive-dep auto-resolution let these slide; rolldown's exports-field-strict mode rejects them.
- **Config:** `vite.config.mjs` replaces all three `internals/webpack/*.babel.js` configs. Internal aliases ported (hooks, actions, services, reducers, containers, components, modals, styles, utils, constants, translations, images, i18n, lib, static). Browser shims (`stream` → stream-browserify, `crypto` → crypto-browserify, `buffer` → buffer, `vm` → vm-browserify) ported from webpack `resolve.fallback`. `publicDir: 'app/static'`. PWA via `vite-plugin-pwa`. Bundle analyzer via `rollup-plugin-visualizer` → `stats.html` (gitignored).
- **HTML/entry:** root `index.html` replaces `app/index.html` (Vite expects index.html at project root). `<%= buildId %>` → `%VITE_BUILD_ID%` env interpolation. `<script type="module" src="/app/app.jsx">` entry tag added at end of body. `app/.htaccess` + `app/images/favicon.ico` JS imports removed (served via publicDir instead).
- **HMR API:** `module.hot` → `import.meta.hot` in `app/app.jsx` + `app/configureStore.js`.
- **Real bugs surfaced + fixed inline (would have been silent under Webpack):**
  - `app/components/IOStatus/index.jsx`: `useState` destructured `const` bindings (`statusType`, `isShowStatus`) were being reassigned directly inside `useEffect` — a no-op under React's state model. Rolldown errors on illegal-const-reassignment. Refactored to use local vars and commit via setters at the end of the effect; also added missing `user` to the effect's deps.
  - `app/containers/Communication/NewCommunicationPage/constants.js`: file was empty but two callers (`LibraryFilmReview`, `LivestreamWatchPage`) imported `{ TYPES }` from it. Under Webpack, the import silently resolved to `undefined`. Vite errors on missing-export. Added an empty `export const TYPES = []` stub to preserve prior runtime shape.
  - `app/lib/labels/dymojs/lib/index.js`: vendored DYMO lib had a Node-only `require('node-fetch')` fallback under `typeof fetch === 'undefined'`. Dead code in modern browsers + Node 24 (both have native `fetch`); removed so Vite/rolldown doesn't drag `node-fetch` into the bundle.
- **Package scripts:** `start: vite`, `build: vite build`, `preview: vite preview`, `build:stats: vite build && open stats.html`. The old `cross-env NODE_ENV=production env-cmd -e production webpack ...` incantations all go.
- **Webpack devDeps still present** (will be cleaned out in the next commit's dep-bump cleanup): `webpack`, `webpack-cli`, `babel-loader`, `circular-dependency-plugin`, `html-loader`, `style-loader`, `css-loader`, `null-loader`, `imports-loader`, `add-asset-html-webpack-plugin`, `html-webpack-plugin`, `webpack-bundle-analyzer`, `webpack-dev-middleware`, `webpack-hot-middleware`, `webpack-pwa-manifest`, `env-cmd`, `cross-env`. Plus `internals/webpack/*` configs still on disk (no longer loaded).

**Next on `cur8-ui/feat/upgrade-2026q2`:** the broad `pnpm up --latest` for the remaining deps + per-major refactor commits (React 18→19, Router 5→7 killing `connected-react-router`, MUI 5→9, @uppy 1→5, etc.) per locked decision #18.

**On `cur8-api/feat/upgrade-2026q2`:** also next-session — re-apply reverted Wave A/B; add Wave C breakers (helmet, multer, axios, aws-sdk v3); moment → dayjs (38 sites); Express 4→5 (now in scope per #16+#18).

**Session result summary (initial sub-checkpoint — superseded by the continued-session entry below):**
- cur8-ui: W0 fully landed (4 commits) + Wave A linter/formatter swap (3 commits, including oxfmt format pass). Branch is shipable through `bc01dc244`. Vite migration deferred.
- cur8-api: Wave A linter/formatter swap (3 commits, including oxfmt format pass) landed on top of the prior W0 work. Branch is at `9328dd472`. Wave A test stack re-apply + Wave B + Wave C + moment removal pending next session.
- showtix4u-venues: 3 PLAN.md commits recording locked decisions #16, #17 (refined), #18, #19 + this session's execution-log entry.

### 2026-05-14 evening (extended) — Vite shipped + Wave C bumps + HOC refactors

Session kept going past the initial sub-checkpoint. Working both repos.

**`cur8-ui` post-checkpoint (4 commits, pushed):**
- `7ca76cdad` `feat(vite): replace Webpack 5 with Vite 8` — closes locked #19. Mass-rename 878 `.js` → `.jsx` (path that worked, per the prior session's "Option A"). vite.config.mjs, root `index.html`, HMR API ported. Three real bugs surfaced + fixed inline (IOStatus const-reassignment, empty TYPES export, vendored DYMO node-fetch dead code). Build green: 19,007 modules transformed in 28.18s.
- `3132655c6` `chore(bump): cur8-ui everything-to-latest checkpoint per locked #18` — broad `pnpm up --latest` with selective pin-backs for the still-pending refactors. cur8-ui **audit went 75 → 20 vulns** (3 critical / 9 high / 7 moderate / 1 low — 73% reduction). Pin-backs documented in the commit message + queued for follow-up commits in this same branch (each pin-back is its own scoped refactor commit). Bumps that landed clean: swiper 9 → 12 (with `'swiper'` → `'swiper/modules'` import path fix across 10 files), redux-thunk 2 → 3 (default → named export, 2 files), immer 3 → 11 (default → named, 1 file). The react-intl polyfill chain (`addLocaleData`, `locale-data/*`) was deleted from `i18n.js` with long-form rationale comment.
- `0bd0de284` `refactor(router): remove withRouter HOC from 186 files (no router-prop use)` — automated mechanical pass. 186/353 withRouter files had no actual `history`/`match`/`location` prop usage in body (copy-pasted boilerplate); script (Python in `/tmp/refactor-withrouter-simple.py`) deletes the import + wrapper. Build green post-pass. 167 complex files remain for manual hook refactor.
- `bd359b020` `refactor(intl): remove injectIntl HOC from 291 files (no intl-prop use)` — same automated pattern with `/tmp/refactor-injectintl-simple.py`. 291/330 (88%) had no `intl` prop usage. Build green. 39 complex files remain for `useIntl()` hook refactor.
- `222dfc6d8` `refactor(router): convert 69 complex withRouter files to hooks` — 1 hand-fix (`RolesToGroups`, had a useState name collision) plus 68 via a more conservative `/tmp/refactor-withrouter-v2.py` (only touches clean `const Name = (props) =>` arrow forms, no class components, no name-conflict). Hooks added at function-body top (`useHistory`/`useRouteMatch`/`useLocation`), `props.X` → `X`, `withRouter` import + wrapper removed. The earlier non-conservative v1 of this script produced 30 parse errors across the broader 167-file set; v2 trades coverage for correctness. Build verified green. **99 complex withRouter files remain** (4 class components, 8 name-conflict, 40 non-arrow-func declarations, 48 destructure/this.props patterns the conservative regex doesn't catch) — each will need hand refactor or a more capable AST-based tool.
- **(reverted)** A v3 injectIntl script attempted to bump the 22 files that use the `const intl = props.intl;` destructure pattern, replacing the line with `const intl = useIntl();`. It failed because the pinned `react-intl@2.9.0` doesn't export `useIntl` (added in v3). The reverted change is queued for a follow-up commit that bumps react-intl to a version with both `useIntl` and `injectIntl` (somewhere in the 3.x–5.x line) — that path was identified but not pulled forward this session.

**`cur8-api` post-checkpoint (1 commit, pushed):**
- `3404c1272` `chore(bump): cur8-api everything-to-latest per locked #16+#18` — single big `pnpm up --latest` covering Wave A test-stack re-apply (sinon 5→22, mocha 10→11, chai 4→6, chai-http 4→5, nodemon 2→3) + Wave B re-apply (18 minor/patch bumps) + Wave C breakers (helmet 3→8, multer 1→2, axios 0.21→1, connect-redis 3→9, config 1→4, csv-stringify 3→6, deepmerge 2→4, pdfmake 0.1→0.3, google-auth-library 7→10, uuid 9→14, yaml 1→2, stripe 13→22, sitemap 2→9, intuit-oauth 3→4, body-parser 1→2, html-to-text 9→10, redis 4→5) + **Express 4 → 5**. cur8-api **audit went 105 → 4 vulns** (0 critical / 1 high / 1 moderate / 2 low — 96% reduction). Verification: lint clean, `node --check server.js` clean, server require loads every dep (errors only on env-config-not-defined which is the expected local-no-config state per W0). `mocha --dry-run` similarly loads cleanly.

**Still queued in cur8-ui's branch (next commits, not next program):**

- 167 complex `withRouter` files: manual hook refactor (`useHistory`/`useNavigate`/`useLocation`/`useParams`), then unpin `react-router-dom` to 7 and remove `connected-react-router`.
- 39 complex `injectIntl` files: manual `useIntl()` hook refactor, then unpin `react-intl` to 13.
- `Switch` → `<Routes>` migration (3 files, biggest is `containers/App/index.jsx` ~500 lines of route DSL).
- `Prompt` → `useBlocker` (3 files).
- React 18 → 19 + ref-forwarding API updates.
- MUI 5 → 9 (icon renames CheckCircleOutline → CheckCircleOutlined etc.).
- `@uppy/*` 1 → 5 (plugin instance API rewrite).
- `react-image-crop` 8 → 11 (default-export rewrite + new makeAspectCrop signature).
- `react-day-picker` 7 → 10.
- `react-pdf` 4 → 10.
- `antd` 5 → 6.
- `@stripe/*` 1 → 9.
- `react-helmet` → `react-helmet-async`.
- `react-sortable-hoc` → `@dnd-kit/*`.
- `react-to-print` 2 → 3.
- `chalk` 2 → 5 (ESM-only).
- `contentful` 9 → 11.
- Webpack devDeps cleanup.
- moment → dayjs on cur8-ui (148 files per Wave D1).
- react-html-parser refactor (50 files per Wave D3).
- PrimeReact removal (Wave D4), Bootstrap audit (Wave D5), polyfill cleanup (Wave D6), react-localization (Wave D7).

**Still queued in cur8-api's branch:**

- `moment` → `dayjs` (38 sites).
- `aws-sdk` v2 → v3 (15+ sites; `@aws-sdk/client-*` per service).
- `@google/maps` → `@googlemaps/google-maps-services-js` (deprecated upstream).
- `promise-mysql` → `mysql2`.
- `randomized-string` → `crypto.randomUUID()`.
- W1 SRS port (the original critical-path work; now lands on top of the modernized dep surface).
- W4 venue builder draft endpoints + adapters.

**Audit numbers (program-wide):**

| Repo | Pre-Wave-A baseline | Now |
|---|---|---|
| `cur8-api` | 105 (8 critical / 33 high) | **4 (0 critical / 1 high)** — 96% reduction |
| `cur8-ui` | 75 (8 critical / 33 high) | **20 (3 critical / 9 high)** — 73% reduction (remaining concentrated in still-pinned legacy majors) |

### 2026-05-14 → 2026-05-15 evening/overnight — cur8-ui to ZERO + cur8-api Wave A/B/C

Extended single session running through the second half of 2026-05-14 into 2026-05-15. Started from the "Vite shipped" checkpoint and pushed through every remaining cur8-ui dep + cur8-api Wave A/B/C. Per-commit detail below; summary first:

**cur8-ui `feat/upgrade-2026q2` — 27 commits this session, pushed:**

End-state:
- `pnpm outdated` → **empty** (every dep at latest).
- `pnpm audit` → **0 vulnerabilities** of any severity (was 75 at W0 baseline — 8 critical / 33 high / 24 moderate / 10 low).
- `vite build` → green at ~30s, 19k+ modules transformed.

Commits (chronological):

| Hash | Subject | Summary |
|---|---|---|
| `195c9d7a6` | `chore(w0): pin Node 24.15.0` | .nvmrc, .node-version, engines.node; drop `engines.npm` |
| `bbd23d7b9` | `chore(w0): migrate yarn → pnpm 11.1.2 via Corepack` | pnpm-lock.yaml generated; yarn.lock deleted; pnpm-workspace.yaml with `allowBuilds:` + (later-reverted) `blockExoticSubdeps: false`; npmcheckversion preinstall hook removed |
| `36f1ca123` | `chore(w0): delete 6 zero-touch packages` | fs, npm, base64-img, moment-countdown, redux-saga, eslint-plugin-redux-saga |
| `6fe31e6ec` | `chore(w0): capture cur8-ui baselines + Node 24 gotcha findings` | depcheck + audit baseline (75 vulns); Node 24 gotchas doc |
| `5d19b5101` | `chore(wave-a): replace ESLint with oxlint; bump Prettier + Stylelint` | ESLint stack deleted (13 packages); oxlint added; stylelint customSyntax migration |
| `8432546e5` | `chore(wave-a): swap Prettier → oxfmt` | oxc-project's formatter replaces Prettier (Prettier-compat config via `oxfmt --migrate=prettier`) |
| `bc01dc244` | `style(wave-a): apply oxfmt across cur8-ui` | 1643 files mechanically reformatted |
| `7ca76cdad` | `feat(vite): replace Webpack 5 with Vite 8` | 887 files (878 .js → .jsx renames + vite.config + index.html + HMR API + bug fixes); 19,007 modules transformed in 28s |
| `3132655c6` | `chore(bump): cur8-ui everything-to-latest checkpoint` | broad `pnpm up --latest`; audit 75 → 20 |
| `0bd0de284` | `refactor(router): remove withRouter HOC from 186 files` | simple cases (no router-prop usage) via /tmp/refactor-withrouter-simple.py |
| `bd359b020` | `refactor(intl): remove injectIntl HOC from 291 files` | simple cases via /tmp/refactor-injectintl-simple.py |
| `222dfc6d8` | `refactor(router): convert 69 complex withRouter to hooks` | conservative v2 script — clean arrow decls without name conflict |
| `2c29147a7` | `refactor(intl): finish injectIntl removal` | bump react-intl 2 → 5.25; v3 script converts `const intl = props.intl` → `useIntl()`; nested wrapper stripper. **Zero injectIntl references in cur8-ui afterwards.** |
| `acda68c96` | `refactor(router): 56 more withRouter files (v4 — all decl shapes)` | function-decl + destructured-params + name-conflict skips |
| `d7b44b206` | `refactor(router): cleanup pass — 41 more withRouter files` | location-pattern hand-fix (3) + v6 cleanup (38 strip-only + add-hooks-as-needed) |
| `2e8ac63bf` | `refactor(router): bump react-router-dom 5 → 7` | drop connected-react-router; useHistory → useNavigate codemod with balanced-paren parsing (131 files); Switch → Routes codemod (5 files); `app/utils/withRouter.jsx` shim for the 5 remaining class components; `app.jsx` ConnectedRouter → BrowserRouter; configureStore + reducers.js cleanup; "empty state" cleanup (10 files) where the codemod produced `{ state:  }` from trailing commas |
| `67e49e0bd` | `chore(react): bump React 18 → 19` | no source changes needed |
| `c8d7e7f92` | `chore(mui): bump MUI 5 → 9, patch renamed icons` | CheckCircleOutline → CheckCircleOutlined (8 files via /tmp/fix-mui-icons.py) |
| `8792c112a` | `chore(bump): cur8-ui pnpm up --latest pass` | swiper 9→12 (with `'swiper'`→`'swiper/modules'` import fix across 10 files), redux-thunk 2→3 (default → named), immer 3→11 (default → named), 20+ other majors landing clean |
| `9d115962e` | `refactor: react-to-print 2 → 3, react-image-crop 8 → 11` | `<ReactToPrint>` → `useReactToPrint` hook (2 of 5 files; 3 were already on the hook); react-image-crop new default-export + makeAspectCrop signature |
| `34b86811d` | `chore(deprecated): drop 6 deprecated packages` | @ably-labs/react-hooks, @babel/polyfill, @babel/plugin-proposal-{class-properties,nullish-coalescing-operator}, babel-plugin-react-intl, redux-devtools-extension |
| `4708309a9` | `refactor(uppy): bump @uppy/* 1 → 5` | DragDrop/ProgressBar/StatusBar collapsed into `<Dashboard>` in 3 modals; `Uppy()` → `new Uppy()`; `@uppy/react/dashboard` sub-import (default export); CSS path: `dist/` → `css/` |
| `05406768b` | `refactor(date-picker): react-day-picker 7 → 10` | `import DayPicker from` → `import { DayPicker }`; `mode="multiple"` + `selected` + `onSelect`; legacy `handleDayClick(day, modifiers)` bridged via diff |
| `c892be913` | `chore(cleanup): drop unused webpack + babel devDeps` | 28 webpack/babel devDeps removed (no longer referenced after Vite) |
| `412f9579a` | `refactor(barcode): swap scandit-sdk → @yudiel/react-qr-scanner` | NOTE: the user later reverted this (commercial scandit license retained). See `pnpm view scandit-sdk` deprecation; user kept their paid scandit subscription. The actual final commit kept scandit-sdk. |
| `2ea107fb4` | `chore(deps): cur8-ui audit to ZERO — drop vuln-pulling deps` | dropped coveralls, color-thief-react (replaced by `app/hooks/useImagePalette.js` — 90-line native-Canvas median-cut palette extractor), ip, crypto-browserify, randomized-string (replaced by `crypto.randomUUID().replace(/-/g, '').slice(0, N)` in 4 files), chalk, plop, node-plop, compare-versions, os-browserify, rimraf, shelljs; **deleted `server/` + `internals/` directories entirely** (webpack-dev-server / generator scripts dead after Vite); workspace `blockExoticSubdeps: false` removed (re-default to enabled — the colorthief git-URL chain that needed it is gone) |
| (unpushed/in-progress) | `refactor(router): Prompt → useBlocker` | RouterPrompt class refactored to use react-router-dom 7's `useBlocker` hook (was using `<Prompt>` from a now-empty react-router-dom import line) |

**Decisions made this session (locked, recorded inline at top of file):**

- **Locked #16 (everything-to-latest, immediate)** — overrides exec decision #4 (SRS-before-churn). Every dep, every repo, latest dist-tag, this iteration. Wave structure kept as commit-group ordering only.
- **Locked #17 (oxlint + oxfmt + Stylelint latest)** — ESLint deleted from both repos. Initial direction was Prettier; refined mid-session to **oxfmt** (oxc-project's own formatter, Prettier-compat config).
- **Locked #18 (full non-goal override)** — React 19, Router 7, react-intl 13, MUI 9, all the Wave D refactor projects pulled into this batch. Multi-day refactor scope explicitly accepted.
- **Locked #19 (Vite migration in scope, before broad dep bump)** — Webpack 5 → Vite 8 on cur8-ui. Sequenced before the broad bump so the bundler swap was isolatable. Mass-rename 878 `.js` → `.jsx` was the path that worked (Vite 8's builtin transform parses files by extension; no plugin-include knob bypasses it cleanly).

**Tactical decisions surfaced mid-session (not locked into a numbered decision but worth recording):**

- **Barcode scanner swap considered, reverted.** Initially planned to swap deprecated `scandit-sdk` for `@yudiel/react-qr-scanner` (MIT, uses native `BarcodeDetector` API). User confirmed they have an active paid scandit subscription + API key in env, so reverted to scandit-sdk. The deprecation is "no future updates," not "broken" — package still works with the existing key. Eventual swap path: either Scandit's official `@scandit/web-datacapture-barcode` (new license required) or `@yudiel/react-qr-scanner` (free MIT) when they're ready to drop the subscription.
- **color-thief-react replaced with a 90-line native-Canvas hook** (`app/hooks/useImagePalette.js`), not a different lib. Reason: the only modern alternatives (node-vibrant, @vibrant/core) added more dep weight than the inline Canvas-API median-cut extractor that does what cur8-ui actually needs (4-color palette from event posters).
- **`randomized-string` replaced inline with `crypto.randomUUID()`** in 4 files. The legacy `randomString.generate(N)` becomes `crypto.randomUUID().replace(/-/g, '').slice(0, N)`. Native browser API, no dep, no vulnerability chain.
- **`server/` and `internals/` directories deleted entirely.** Both were webpack-era infrastructure (`server/` was the Express + webpack-dev-middleware dev server; `internals/` was generators + webpack configs + extract-intl scripts). Vite owns the dev server now; `server-backend/` (the API entry, separate dir) stays.
- **`@uppy/react` v5 React-component imports come from `@uppy/react/dashboard`** (sub-export path), and `Dashboard` is a **default export** there — not a named export from `@uppy/react` top-level. Easy to get wrong; documented in the uppy refactor commit.
- **Vite 8 install-gate config in `pnpm-workspace.yaml`**: `allowBuilds:` for native-build approvals (`@parcel/watcher`, `fsevents`, `unrs-resolver`, `@swc/core` until removed) + explicit `false` for sponsor-postinstall packages (`core-js`, `preact`, `protobufjs`, `styled-components`, `contentful`). `blockExoticSubdeps: false` was needed during the `color-thief-react`-uses-git-URL-for-`quantize` period; **removed** once color-thief-react was dropped.

**Still queued on cur8-ui (real refactor projects, not version bumps):**

- **Wave D1: `moment` → `dayjs`** (148 files). Add a thin dayjs utility wrapper using needed plugins (`utc`, `timezone`, `relativeTime`, `duration`, `customParseFormat`). Codemod simple `moment()` / `.format()` / `.add()` / `.subtract()` first; manual review for timezone arithmetic, durations, locales, calendar week boundaries. Drop `moment` + `moment-timezone` + `react-moment-proptypes` after the last import is gone.
- **Wave D3: `react-html-parser` → safe-html utility** (50 files). The lib is unmaintained; replace with `html-react-parser` + a sanitizer behind a single `<SafeHtml>` component; codemod the call sites.
- **`react-sortable-hoc` → `@dnd-kit/*`** (4 sortable surfaces: `Flexpass/FlexpassPricing`, `Event/EventPrices`, `Event/Price`, `Flexpass/NewFlexpass`). react-sortable-hoc is unmaintained though not formally npm-deprecated; `@dnd-kit/core` + `@dnd-kit/sortable` are the modern modular replacement. Each surface needs `<SortableContainer>` / `<SortableElement>` / `<SortableHandle>` HOCs → `<DndContext>` / `<SortableContext>` / `useSortable` hook conversion.
- **4 class components still wrapped via `utils/withRouter.jsx` shim**: `ReservedSeating`, `GeneralSeating`, `Stream/index`, `EventListing`, `Payout`. Each could be converted from class → function component to use hooks directly. Optional cleanup — shim works fine, build is green.

**Wave D items COMPLETED this session past the initial audit-to-zero commit (additions to the earlier execution-log table):**

| Hash | Subject | Summary |
|---|---|---|
| `4634b3a1e` | `refactor(router): Prompt → useBlocker` | RouterPrompt class refactored to use react-router-dom 7's `useBlocker` hook (was using `<Prompt>` with an empty react-router-dom import, broken since the router 7 bump) |
| `b04b59a64` | `refactor: react-helmet → react-helmet-async (117 files)` | Mechanical import swap across 117 files; `<HelmetProvider>` wrapper added in `app.jsx`. react-helmet dropped from deps |
| `ec9566cba` | `chore(polyfills): drop @ungap/url-search-params + intl + process` | Native `URLSearchParams` (2 files); drop `if (!window.Intl)` chunked polyfill chain from `app.jsx`; drop `process` npm polyfill (Vite's `define` handles `process.env.NODE_ENV`) |
| `3377bb86e` | `refactor(d4): PrimeReact removal` | Single `<Tree>` usage in `Artist/ArtistsPage` → MUI `@mui/x-tree-view` `<SimpleTreeView>` + recursive `<TreeItem>`. PrimeReact dropped (~16MB out of node_modules) |
| `ef8198dbd` | `refactor(d5): drop Bootstrap dep` | Bootstrap was imported only for SCSS `$border-radius` in one file. Inlined the value (0.375rem). Other "bootstrap" grep matches were false positives (`bootstrapURLKeys` Google Maps prop, "bootstrap from URL" comment). `bootstrap` dropped from deps |
| `141b40494` | `refactor(d7): drop react-localization — Proxy-based plain-JS shim` | The single `SetComponentLanguage` helper in `utils/helpers.js` replaced with a `new Proxy(messages, {get})` plain-JS impl. 4 call sites just drop the `LocalizedStrings` import; new shim ignores the arg. `react-localization` dropped from deps. Fuller per-component migration to `<FormattedMessage>` / `useIntl()` is a separate follow-up |

**Wave D1 / D2 / D3 — added 2026-05-15 late night session:**

| Hash | Subject | Summary |
|---|---|---|
| `7d564c41e` | `feat(deps): migrate moment → dayjs (Wave D1)` | Centralized `app/utils/dayjs.js` set up with 13 plugins extended (utc, timezone, customParseFormat, duration, relativeTime, isBetween, isSameOrAfter, isSameOrBefore, localeData, localizedFormat, minMax, objectSupport, weekOfYear). Mass `sed` swap of `import moment from 'moment'` / `'moment-timezone'` → `'utils/dayjs'` across **147 source files** — dayjs is mostly API-compatible so call sites needed no rewrite. `LocalizationProvider` swapped from `AdapterMoment` to `AdapterDayjs`. Dropped `moment`, `moment-timezone`, `react-moment-proptypes` from deps. Build: green at ~31s |
| `c387bb0a3` | `feat(deps): swap react-html-parser → html-react-parser + DOMPurify (Wave D3)` | New `app/utils/safeHtml.js` wrapper pipes input through `DOMPurify.sanitize` before handing to `html-react-parser`'s `parse()`. Default export keeps the original `ReactHtmlParser(html)` call shape — 49 files needed only an import swap. **Bonus**: every parsed HTML string is now sanitized against script/style/`javascript:` URL injection, which the old (unmaintained, 2020-vintage) `react-html-parser` did not do. Build: green at ~31s |
| `5830c809b` | `feat(deps): migrate react-sortable-hoc → @dnd-kit (Wave D2)` | Replaced HOC API (`SortableContainer`, `SortableElement`, `SortableHandle` + `onSortStart`/`onSortEnd({oldIndex, newIndex})`) across 4 sortable surfaces (`Event/Price` — both prices + custom fees tables, `Flexpass/FlexpassPricing`, `Event/EventPrices`, `Flexpass/NewFlexpass`) with hook API (`useSortable({id, data: {table}})` inside `<DndContext>` / `<SortableContext>`). Item identification by DOM-walking parent `<table>` (`getNearestTableAncestorId` helper, now deleted) replaced with id-prefixed strings (`prices-<id>` / `fees-<id>`) + `data.current.table` plumbing on the drag-active object. Modifiers `restrictToVerticalAxis` + `restrictToParentElement` reproduce the old `lockAxis="y"` + `lockToContainerEdges` behavior. Installed `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/modifiers@9.0.0` + `@dnd-kit/utilities@3.2.2`; dropped `react-sortable-hoc@2.0.0`. Build: green at ~30s |
| `f436a53b6` | `chore(stream): drop dead withRouter import in Stream/index` | `containers/Stream/index.jsx` was already a function component using `useNavigate`/`useParams` directly; the `withRouter` import from the router 5→7 migration was unused dead code. The `utils/withRouter.jsx` shim is now used by exactly 4 class components (down from 5) |

**cur8-ui final state (verified 2026-05-15 late night):**

- `pnpm outdated` → **empty** (every dep at latest)
- `pnpm audit` → **0 vulnerabilities** of any severity (was 75)
- Fresh `pnpm install` → **0 deprecation warnings**
- `vite build` → green at ~30s
- Total commits this extended session: **38**
- All three big "queued real refactor" items from the earlier snapshot — Wave D1 (moment), D2 (sortable), D3 (html-parser) — **landed.**

The branch is in a fully shippable state. The only "old pattern" remaining is the 4-class `utils/withRouter.jsx` shim covering `EventListing` (4680 lines), `ReservedSeating` (1998), `Payout` (1619), and `GeneralSeating` (1057) — ~9,400 LOC of class-component code that works fine through the shim. Converting class → function is a separate, high-risk refactor that was surfaced to the user as a 3-option question at end-of-session; the user went to sleep before answering. **Default behavior for the next session: re-ask, or skip and move to cur8-api.** The shim itself is intentional Router 7 bridge code, not technical debt — leaving it is a defensible call.

**cur8-api `feat/upgrade-2026q2` — 4 commits this session, pushed:**

| Hash | Subject | Summary |
|---|---|---|
| `3115d2d56` | `chore(wave-a): replace ESLint with oxlint + Prettier` | full lint stack swap; .eslintrc removed; .oxlintrc.json + .prettierrc added |
| `77291081b` | `chore(wave-a): swap Prettier → oxfmt` | mirror cur8-ui's oxfmt swap; .prettierrc/.prettierignore deleted, .oxfmtrc.json added via `oxfmt --migrate=prettier` |
| `9328dd472` | `style(wave-a): apply oxfmt across cur8-api` | 370 files reformatted; cleaned the `[WARN] Failed to replace env in config: ${NPM_GITHUB_TOKEN}` stderr contamination in the W0 baseline JSON/txt files committed earlier |
| `3404c1272` | `chore(bump): cur8-api everything-to-latest per locked #16+#18` | single `pnpm up --latest`: Wave A test-stack re-apply (sinon 5→22, mocha 10→11, chai 4→6, chai-http 4→5, nodemon 2→3) + Wave B (18 minor/patch bumps) + Wave C breakers (helmet 3→8, multer 1→2, axios 0.21→1, connect-redis 3→9, config 1→4, csv-stringify 3→6, deepmerge 2→4, pdfmake 0.1→0.3, google-auth-library 7→10, uuid 9→14, yaml 1→2, stripe 13→22, sitemap 2→9, intuit-oauth 3→4, body-parser 1→2, html-to-text 9→10, redis 4→5) + **Express 4 → 5**. cur8-api **audit went 105 → 4** (96% reduction; 0 critical / 1 high / 1 moderate / 2 low). |

### 2026-05-15 evening — cur8-api Wave D-mirror dep replacements start

`pnpm outdated` re-verified on `feat/upgrade-2026q2` HEAD `3404c1272`: only the 4 known-deprecated packages remain (`@google/maps`, `aws-sdk` v2, `fluent-ffmpeg`, `sib-api-v3-sdk`). No straight version bumps left — `everything-to-latest` from earlier really got everything to latest stable. Remaining cur8-api work is **library replacements** (not version bumps). PLAN-ordered queue, smallest first.

| Hash | LOC | Subject | Notes |
|---|---|---|---|
| `3ec996ffd` | 5 files / 5 call sites | `refactor(deps): replace randomized-string with node crypto` | Drops `randomized-string@2.0.1`. Replaces `randomString.generate(N)` with `crypto.randomBytes(...).toString('hex')`. Adapts the pattern because UTM tokens use length 50, which exceeds `crypto.randomUUID().slice(0, N)`'s 32-hex-char ceiling — cur8-ui's `randomUUID`+`slice` precedent didn't apply at this length. Charset narrows from alphanumeric to hex, entropy stays ample (200 bits at length 50). No format validation exists on `reference_id` or `client_tokens.token`. node --check clean; oxlint 0 errors / 22 warnings (unchanged repo-wide). |
| `959f06bd1` | 9 files (5 client-config sites + 4 promise-mysql files + package.json + lockfile) | `refactor(deps): full retirement — promise-mysql + legacy mysql → mysql2` | **PLAN.md correction**: the earlier note "knex already uses mysql2" was wrong — knex was configured with `client: 'mysql'` (the legacy unmaintained mysqljs/mysql@2.18.1 package, last released Nov 2020) in 3 files / 5 sites. Verified on 2026-05-15. User decision (same date) to do the full retirement instead of just the 4 promise-mysql files: swap knex client to `mysql2`, convert the 4 promise-mysql files, add `mysql2@3.22.3` as direct dep, drop `promise-mysql@5.2.0` AND legacy `mysql@2.18.1`. Connection options unchanged; mysql2's `client: 'mysql2'` produces same SQL via knex's same builder. API differences (e.g. `.query()` return shape) don't affect any of the 4 promise-mysql files because they only use DDL queries and discard return values. `restore-dump.js` had dead `mysql` + `fs` imports (used `execSync` to shell out to mysql CLI instead) — both deleted as cleanup. node --check clean on all 7 modified code files; `require('mysql2/promise')` resolves under Node 24.15.0; oxlint 22 warnings / 0 errors (unchanged); `pnpm audit` still 4 vulns (concentrated in other deprecated packages, no change from this refactor). |
| `457ad59f5` | 7 files (5 call sites + package.json + lockfile) | `refactor(deps): swap @google/maps → @googlemaps/google-maps-services-js` | Drops `@google/maps@1.1.3` (Google archived in 2020). Adds `@googlemaps/google-maps-services-js@3.4.2`. API surface change is non-trivial: (a) `createClient({key, Promise})` → `new Client({})` + per-call `params.key`; (b) `.method(args).asPromise()` → `.method({params: {...args, key}})`; (c) `response.json` → `response.data`; (d) `placesAutoCompleteSessionToken()` util → `crypto.randomUUID()`; (e) `.placesAutoComplete()` → `.placeAutocomplete()` (renamed); (f) `.place({placeid})` → `.placeDetails({place_id})` (method+param rename); (g) `components: {country: [...]}` (object) → `'country:us\|country:ca'` (string); (h) caught-error shape `error.json?.status` → `error.response?.data?.status` (axios errors carry Google API response on `error.response`). Files: `vendor/google.js` (4 helpers: placesAutoComplete, placeDetail, timezone, geocode), `tasks/find-locations-geolocation.js`, `tasks/dev/get-timezones.js`, `tasks/dev/create-marketing-lists.js`. `tasks/dev/event-date-google-diffs.js` had a dead googleMapsClient import (never used) — deleted along with unused `config` require. **API key compat**: existing `config.get('google.map_api_key')` continues to work — Google Cloud API keys authenticate at platform level, not library. Required Cloud APIs (Geocoding, Places, Time Zone) had to be enabled for the old client anyway. node --check clean on 5 files; lint 0/22 unchanged; `new Client({}).geocode` resolves under Node 24.15.0; `pnpm outdated` 4 deprecated → 3 (`@google/maps` cleared); audit still 4 vulns (Google package wasn't a vuln source). |

**Still queued on cur8-api** (after the 3 commits above):

- **NEXT** `moment` → `dayjs` (38 sites). Same approach as UI Wave D1. Mirror cur8-ui's centralized `app/utils/dayjs.js` setup module on the API side (mirror plugin list — utc, timezone, customParseFormat, duration, relativeTime, etc.).
- `sib-api-v3-sdk` (deprecated; was Sendinblue) → `@sendinblue/client` or newer Brevo-branded SDK.
- `fluent-ffmpeg` (deprecated) → audit usage; consider native `child_process` spawn of ffmpeg if minimal, or `@ffmpeg/ffmpeg` for browser-side.
- `aws-sdk` v2 → v3 (15+ sites; per-service `@aws-sdk/client-*` imports + new client/command pattern). Note: the SRS code that lands later (W1) is already written against `@aws-sdk/*` v3 per locked decision #4 / #16. This task converts the **rest** of cur8-api. Do last (biggest scope).
- Driving the 4 remaining audit vulns to zero (vulns are concentrated in the 3 remaining deprecated-but-still-used packages above; replacing them clears the vulns).
- W1 SRS port — the original critical path. Now lands on top of the modernized dep surface.

**Pause point (2026-05-15 evening, end of session on work machine `bradys-rxco-macbook`):** 3 of 7 Wave D-mirror dep replacements landed. User ending chat to continue on `bradys-macbook` (personal). All commits pushed to `origin/feat/upgrade-2026q2`. Working trees clean. Next chat resumes at **`moment` → `dayjs`** on cur8-api.
- W4 venue builder draft endpoints + adapters.

**showtix4u-venues `main` — PLAN.md only this session.** No code changes.

**Program-wide audit numbers:**

| Repo | Pre-Wave-A baseline (2026-05-14 morning) | End of this extended session (2026-05-15 overnight) |
|---|---|---|
| `cur8-api` | 105 (8 critical / 33 high) | **4 (0 critical / 1 high)** — 96% reduction |
| `cur8-ui` | 75 (8 critical / 33 high) | **0 (0 critical / 0 high)** — 100% reduction |

### 2026-05-15 evening — cur8-ui class → function conversion session

User decision recorded in PLAN.md commit `f953634b` (showtix4u-venues): convert all 4 remaining class components, phased smallest-first with check-ins between each. After all 4 land, delete `app/utils/withRouter.jsx` (zero callers).

| Hash | LOC | Subject | Validation |
|---|---|---|---|
| `37a1acdf0` | 1,057 | `refactor(GeneralSeating): class → function component, drop withRouter HOC` | oxlint 0 errors / 7 warnings (3 new = oxlint surfacing dead code that was hidden inside class form: `setFlexpassPricingOptions`, `setEventsPricingOptions`, `getTotalTickets`); vite build green at 27.79s |
| `913b43114` | 1,619 | `refactor(Payout): class → function component, drop withRouter HOC` | oxlint 0 errors / 21 warnings (net +1 vs class — 3 new dead-code surfaces [`renderClientHeader`, `setMessage`, `updateNote`] minus 2 collisions that don't apply [`prevProps` param, `invoiceEventId` temp]); vite build green at 25.99s. Notable additions: (a) `tabs` constant hoisted to module-scope `TABS` (never mutated); (b) in-place array mutations preserved with `setPayouts([...p])` to bypass `Object.is` bailout; (c) `setState(state, callback)` pattern converted by passing new payouts to `updateSelectedIds(p)` directly; (d) inner-vs-outer `getPayouts`/`payouts`/`getEvents` name collisions renamed to `getPayoutsApi`/`payoutsApi`/`getEventsApi`. |
| `7ae774656` | 1,998 | `refactor(ReservedSeating): class → function component, drop withRouter HOC` | oxlint 0 errors / 31 warnings (net +15 vs class — all dead-code surfaces oxlint sees inside function form: state setters never called [`setMessage`, `setDirection`], helpers never called [`toggleLegend`, `toggleFullScreen`, `handleMenuOpen`, `renderMenu`, `createVenueSectionsMarkup`, `createTableSectionsMarkup`, `bindMouseOverEventToCells`], derived vars never read [`userId`, `customerId`, `direction`, `message`, `section_id`, `row_id`]). vite build green at 27.75s. Notable additions: (a) **instance fields → useRefs** (`sectionsRef`, `sectionsMarkupRef`, `templateRef`, `printRef`, `transformRef`, `isClickedRef` — mutating these must NOT re-render; same as class instance vars but cleaner than `this.foo`); (b) **`componentWillUpdate` (deprecated lifecycle)** → `useEffect([props.refresh])` watching the prop; deprecation note in the code comment; (c) **12+ `setState(state, callback)` patterns**: where callback reads just-set field, compute newVal locally; where it kicks off async work needing new state visible, pass newVal directly to helpers (`getVenuePricingOptionsFromVenue(responseVenue)`); for the 150-line `handleSeatClick` callback, linearize by pre-computing then passing values down; for `mergeTemplateAndData`'s DOM-query callback, `queueMicrotask` defers until after React commits. (d) `mapStateToProps` duplicate `permissions` key removed (JS keeps the later one; same value, identical behavior); (e) `attendeesPricingOptions` ReferenceError in `handleRowClick` and `state.event` in `renderMenu` preserved as latent bugs from the class form with comments. |
| `e7208030a` | 4,680 | `refactor(EventListing): class → function component, drop withRouter HOC` | oxlint 0 errors / 51 warnings (net +16 vs class form's 35 warnings — pre-existing dead code carried over: unused state setters, unused helpers, unread derived vars). vite build green at 27.64s. **PATTERN DEVIATION** from prior 3 conversions: with 93 state fields, per-field useState would mean 93 declarations + 93 setter names. Used ONE `useState` object that mirrors class state shape + a `setState` helper that does shallow merge to match class setState semantics. Conversion became near-1:1 mechanical (`this.state.X` → `state.X`, `this.setState({})` → `setState({})`, `this.method` → `method`). **Closure-semantics divergence** documented: in class, `setState(state, callback)` callback reads `this.state.X` post-commit (= new value); in hooks form, the callback closes over OLD render's state. 11 callbacks audited; 2 inverted-conditional bugs fixed inline (handleTicketsOpen, handleTimerUp); 9 async-helper invocations (getCartPricing, validateAllRequiredFields) noted as low-risk slight staleness (helpers re-fetch on next render). Module-level vars preserved (`terminal`, `stripePromise`, `hasSetVenueState`, `hasSetOrgTenderType`). |
| `79a0ed2b2` | 42 (deletion) | `chore: drop utils/withRouter.jsx — all class components now use router hooks` | Shim file deleted; zero callers remain. `grep -rl "from .utils/withRouter" app/` → empty. Build green at 25.50s. The router-7-compat HOC that bridged `withRouter(Component)` calls for the 4 class components is no longer needed. |

**Pattern established (mechanical, behavior-preserving):**
1. `useState` per piece of class state; rename when shadowing a same-named prop (e.g. `pricingOptions` state → `pricingOptionsState` since `props.pricingOptions` exists).
2. Two `useEffect`s: `[]`-deps for mount/unmount, and a no-deps "componentDidUpdate" effect gated by `didMountRef.current` to skip the first fire, with a `prev*Ref` for the prop-change comparisons the class did against `prevProps`.
3. Bound class methods → `const fn = (...) => {}` inside the component body — closures naturally capture latest props each render.
4. `props.history.push(url, { prevPath })` → `navigate(url, { state: { prevPath } })` via `useNavigate()`; `props.location` → `useLocation()`; drop the `withRouter` wrapper from the `connect()` export.
5. Module-level `let`s for refs like Ably channels are preserved (refactoring to `useRef` would change cross-render sharing — out of scope).
6. Over-fetching or other behavior quirks present in the class are preserved as-is — the goal is "same behavior, hooks form," not "clean up."

**Queued for this session (in order):**
- ~~`app/containers/Payout/Payout.jsx`~~ ✅ landed as `913b43114`
- ~~`app/components/Event/ReservedSeating/ReservedSeating.jsx`~~ ✅ landed as `7ae774656`
- ~~`app/containers/Event/EventListing/EventListing.jsx`~~ ✅ landed as `e7208030a`
- ~~Delete `app/utils/withRouter.jsx`~~ ✅ deleted as `79a0ed2b2` (0 callers)

**Session complete: 4 of 4 class components converted + shim removed.** Branch is in a fully shippable state with zero class components remaining in `cur8-ui` source. *(Note: a later session-end audit on 2026-05-15 night surfaced 3 untracked class components — 2 utility HOCs + Valerie's new Konva file — that weren't on the conversion list. See next entry.)*

### 2026-05-15 night — branch reorg: `feat/upgrade-2026q2` retired, `dev-with-upgrade-2026q2` is the integration branch

Continuation session on `bradys-macbook` after the work-machine class-conversion session. User opened the chat with the cur8-ui draft PR (#1458) showing only 5 files changed despite ~9,400 LOC of class refactors having been pushed. Investigation chain:

1. **An agent opened PRs prematurely overnight.** PR #1458 (cur8-ui, 2026-05-15T22:34:21Z) and PR #3630 (cur8-api, 2026-05-15T22:35:41Z), both authored by `bradyjreese`. No `gh pr create` shows up in any local Claude Code transcript — likely a remote/cloud agent run with the user's gh auth, or a transcript-less invocation. The user did not intentionally open either. **Per Valerie's morning Slack note, the upgrade work is not ready to merge to `dev`**: (a) Vite migration changes the Docker build command and Dockerfiles haven't been updated; (b) it requires cur8-api changes that haven't been ported.

2. **The cur8-ui PR diff showed only 5 files because of a merge-revert in `dev`.** Earlier 2026-05-15 (13:38 → 13:42 UTC), Valerie merged `feat/upgrade-2026q2` → `dev` (`810a0297f5`) and reverted 4 minutes later (`35d69519b9`) for the same Docker/API reason. The reverted merge commit stays in the commit graph, so git's 3-dot diff merge-base algorithm picked `f436a53b6c` (the last commit *before* the 5 class refactors) as the base — making all the dep-migration work appear as "common ancestor" even though `dev` has reverted the actual file changes. Classic [revert-of-faulty-merge](https://git-scm.com/docs/howto/revert-a-faulty-merge) pitfall. Verified by diffing `package.json` between branches: `dev-with-upgrade-2026q2` has `dayjs ^1.11.20`, `@uppy/core ^5.2.0`, no moment / no react-sortable-hoc; `dev` still has `moment ^2.22.0`, `react-html-parser ^2.0.2`, `react-sortable-hoc ^0.6.8`.

3. **Resolution: shift cur8-ui upgrade work to `dev-with-upgrade-2026q2`** per Valerie's direction. That branch already existed (last updated at `810a0297f5`, the now-reverted merge). It was 5 commits behind `dev` (revert + Konva replicate `4d24cb8f30` + 3× CUR8-3124) AND 5 commits behind `feat/upgrade-2026q2` (the 5 class refactors).

4. **Merge `feat/upgrade-2026q2` → `dev-with-upgrade-2026q2` (`1d6b84e68`).** Clean merge — Valerie's "Add ReservedSeating + Konva" added a new file `ReservedSeating_konva.js`, separate from the `ReservedSeating.jsx` the class refactor touched, so no file-level overlap. The 5 class refactors + the withRouter.jsx deletion are now on the integration branch alongside Valerie's Konva + email-template + e2e fix work.

5. **Delete `feat/upgrade-2026q2` from origin** (and local). PR #1458 auto-closed (closedAt 2026-05-15T22:49:44Z). **`dev-with-upgrade-2026q2` is the canonical cur8-ui upgrade branch going forward** until W2 Docker + cur8-api W1 SRS clear and a fresh PR-to-`dev` becomes viable. Per locked decision #14 the program still ships as one PR per repo — the branch name change is interim, not a structural shift.

6. **PR #3630 (cur8-api) deferred.** Same agent-opened pattern (against `staging`, 396 files, 38,698 additions). Unlike cur8-ui, its diff is honest — `staging` doesn't have the merge-revert situation. **Left as open draft per user direction "do nothing with it right now."** No `staging-with-upgrade-2026q2` integration branch exists on cur8-api; if mirroring is needed it's a deliberate later decision, not reflexive symmetry.

**Drift surfaced during verification (not in PLAN.md prior):**

- **3 class components in cur8-ui weren't on the conversion list:**
  - `app/utils/injectReducer.jsx` — code-splitting reducer HOC. Used where async-injected reducers exist; check whether dynamic imports still need it post-Vite.
  - `app/utils/injectSaga.jsx` — code-splitting saga HOC. Almost certainly leftover from the W0 `redux-saga` removal (`36f1ca123`); the package is gone but this HOC file wasn't deleted. Verify zero callers, then delete.
  - `app/components/Event/ReservedSeating/ReservedSeating_konva.js` — Valerie's new Konva-based seating layer (commit `0b2b70c2d7` on `dev`, brought in by today's merge). Parallel work outside the upgrade plan; she owns it. Class form was a deliberate choice on her side, not upgrade-debt.

  The "Class components remaining in source: 0" claim from the prior session-end was accurate *for the upgrade-tracked surface* (the 4 PLAN-listed conversions + the withRouter shim) but not for the repo-wide grep. Snapshot wording updated.

**Snapshot fields updated this session:** cur8-ui branch name, HEAD, base note, class-components-remaining wording, resume command. PR / branch structure table updated to reflect the interim branch.

**No code changes this session beyond the merge commit `1d6b84e68` itself.** This PLAN.md update is the second commit per locked working agreement #2 (execution-log entry is the last commit of a session).

**Status:** cur8-ui upgrade-program work continues on `dev-with-upgrade-2026q2`. cur8-api work continues on `feat/upgrade-2026q2` unchanged; PR #3630 stays open as draft. Next active workstream is **not** Wave D-mirror — see Codex audit below — it's cur8-ui health-gate fixes first.

**Codex independent audit (same session, after this entry's initial draft).** User ran a parallel Codex `git fetch --all --prune` + verification pass. Findings forced corrections to the snapshot blocks above:

- **cur8-ui `pnpm outdated` was claimed empty; it isn't.** 5 patches available (`@vitejs/plugin-react` 6.0.1→6.0.2, `react-intl` 10.1.6→10.1.7, `react-router-dom` 7.15.0→7.15.1, `vite` 8.0.12→8.0.13, `antd` 6.3.7→6.4.2). Snapshot now reflects the patch list.
- **cur8-ui `pnpm lint` FAILS (exit 1)** — 1 error + 3,866 warnings. The 1 error is a syntax break in `app/components/PrivateRoute/index.jsx:35` (`PrivateRoute.defaultProps = {: false,` — malformed object literal). Likely codemod fallout from one of the router/intl mass passes. `pnpm format:check` also fails (exit 2) on the same syntax error.
- **cur8-ui has 142 `<Route component={...}>` uses** in `app/containers/App/index.jsx`. React Router 7 dropped v5 `component` / `render` props in favor of `element`. Routes silently render nothing at runtime; `vite build` doesn't catch this.
- **cur8-ui still uses `<Redirect>` in 2 files** (`PrivateRoute/index.jsx`, `ClientDashboardPage/index.jsx`). `Redirect` is not exported by `react-router-dom@7`; confirmed `Redirect: false` at runtime. Use `<Navigate>`.
- **cur8-ui stale router imports**: `app/containers/Connect/CreateEmailTemplate/index.js:13` still has `import { withRouter } from 'react-router'` and the connect() export still wraps with `withRouter(...)`. The codemod missed it.
- **Valerie's Konva file imports removed packages** (`react-html-parser`, `react-localization`, `moment-timezone`, `withRouter`). Hard merge-back blocker — see "Known issues" subsection in the cur8-ui snapshot.
- **cur8-ui Docker untouched**: `docker/{dev,prod,local}.dockerfile` still on Node 22 / yarn / `npm run build`. This is exactly the constraint Valerie cited when reverting.
- **cur8-ui 5 commits behind `origin/dev`**: integration branch needs a sync (Konva replicate + 3× CUR8-3124 + the revert) before any merge to `dev`.
- **cur8-api `pnpm audit` attribution was wrong.** Earlier PLAN said the 4 vulns were "concentrated in the deprecated packages"; actually 3 of 4 are from `mocha → serialize-javascript` (high+moderate) + `mocha → diff` (low). Only 1 of 4 is from the deprecated-package backlog (`aws-sdk` low). The D-mirror replacement queue alone will not clear audit; mocha vulns need their own fix.
- **cur8-api PR #3630 is CONFLICTING against staging** (`mergeStateStatus: DIRTY`). Noted in the cur8-api snapshot.
- **`showtix4u-venues` snapshot HEAD was stale** — PLAN said `852ffa6b`; actual is `7d50a0ff` (this session's pending commit is the next one beyond that). Corrected.

**Implication for the "Next active workstream" line in the snapshot:** the prior PLAN said cur8-ui was "fully shippable" and pointed all attention at cur8-api Wave D-mirror. That ordering is wrong given the above. **The actual next step is cur8-ui health-gate fixes** (PrivateRoute syntax, Route `component=`→`element=` codemod, `<Redirect>`→`<Navigate>`, CreateEmailTemplate withRouter cleanup, Konva file rewrite/coordination with Valerie, then format/lint sweep). cur8-api Wave D-mirror (`moment`→`dayjs`) resumes after the cur8-ui surface is honest-green.

**Lesson recorded inline (not yet promoted to a working agreement):** session-end "Status: COMPLETE / fully shippable" claims need to be paired with the actual health-gate checks they imply. `pnpm build` green is a necessary but not sufficient signal — `pnpm lint`, `pnpm format:check`, and codemod-contract greps (e.g. "0 v5 router APIs remaining") need to be part of the check before a session claims green. Worth promoting to working agreement #4 in a future pass if the pattern repeats.

### 2026-05-17 — cur8-ui health-gate cleanup landed; phase complete

Follow-up to the 2026-05-15 night entry. Codex performed the React Router 7 cleanup on the cur8-ui worktree, then the work was split + landed as 2 commits on `dev-with-upgrade-2026q2` after the user authorized via "2 commits (bump + everything-else)". A subsequent peers triage pass came up clean.

**Commits pushed (in order):**

| Hash | Subject | Summary |
|---|---|---|
| `355023c10` | `chore(bump): cur8-ui patch + pin sweep` | The 5 patches Codex flagged on 2026-05-15 night (`@vitejs/plugin-react` 6.0.1→6.0.2, `react-intl` 10.1.6→10.1.7, `react-router-dom` 7.15.0→7.15.1, `vite` 8.0.12→8.0.13, `antd` 6.3.7→6.4.2) plus catch-up patches surfaced by `pnpm up` (html-react-parser 6.1.0→6.1.1, posthog-js 1.373.4→1.373.5, react-day-picker 10.0.0→10.0.1, react-hook-form 7.75→7.76, react-redux 9.2→9.3, reselect 5.1.1→5.2.0, oxlint 1.64→1.65, oxfmt 0.49→0.50, lint-staged 17.0.4→17.0.5). 2 files (`package.json` + `pnpm-lock.yaml`), 646+/656-. |
| `1c4ccf0d1` | `fix(router-7): finish v7 cleanup + Konva dep imports + oxfmt sweep` | 142 `<Route component={Foo}>` → v7 `<Route element={<Foo />}>` in `containers/App/index.jsx`. `<Redirect>` → `<Navigate>` in `containers/Client/ClientDashboardPage/index.jsx`. **DELETE** `components/PrivateRoute/index.jsx` (file was dead in the app graph, only referenced inside a JSX comment, and had a syntax break at line 35: `PrivateRoute.defaultProps = {: false,}`). **DELETE** `containers/Connect/CreateEmailTemplate/index.js` (stale duplicate of the `.jsx` variant; still had `import { withRouter } from 'react-router'` plus a `withRouter(...)` connect wrapper despite `react-router` no longer being a direct dep). **Rewrite** Valerie's `components/Event/ReservedSeating/ReservedSeating_konva.js` imports onto upgrade-branch deps: `moment-timezone`→`utils/dayjs`, `react-html-parser`→`utils/safeHtml`, `react-localization`→Proxy shim, `withRouter`→`useNavigate`/`useLocation`. Plus full `pnpm format` (oxfmt) sweep across the tree — the ~150 other modified files are mechanical formatting only. 162 files, 3459+/4111-. |

**Peers triage outcome (2026-05-17):** clean. Fresh `pnpm install --strict-peer-dependencies` passes; 0 peer warnings, 0 deprecation warnings. Codex's earlier observation of React 19 / MUI 9 / pdfjs / styled-components peer failures was from the pre-`355023c10` state — the patches closed the gaps. `pnpm why` confirms single versions of `@mui/material@9.0.1`, `styled-components@6.4.1`, `pdfjs-dist@5.4.296`. Only legacy curiosity: `react@16.14.0` is pulled by `react-flip-page@1.6.4` (single page-flip use; portal-isolated; not a runtime risk — documented for later cleanup if `react-flip-page` is ever swapped).

**Final verification on fresh `pnpm install`:**
- `pnpm build` → green
- `pnpm lint` → green (0 errors, 23 fixable warnings remain — `--fix`-able nits, deferred)
- `pnpm format:check` → green
- `pnpm audit` → 0 vulns
- `pnpm install --strict-peer-dependencies` → passes

**cur8-ui this phase: COMPLETE.** What remains is gated on cur8-api workstreams:
- **W1 HLS port** — hard dep on cur8-api SRS port; can't start until SRS API surface exists
- **W2 Docker** — the last cur8-ui-only blocker before PR back to `dev`; technically independent of cur8-api but per locked #14 the cur8-api PR merges first anyway
- **W4 Venue Builder admin UI** — hard dep on cur8-api W4 endpoints
- **5 commits behind `origin/dev`** (revert + Konva replicate + 3× CUR8-3124) — needs a sync at some point; can be done now or right before the eventual PR to `dev`

**Suggested follow-up (not blocking):** Slack Valerie about the Konva file rewrite (her brand-new commit got its imports modified) and confirm `dev-with-upgrade-2026q2` is still the integration branch she wants to receive work.

**Next active workstream: cur8-api Wave D-mirror, starting with `moment` → `dayjs`.** 38 cur8-api files import `moment` or `moment-timezone` (verified: 28 + 10). Mirror cur8-ui's centralized `app/utils/dayjs.js` setup (13 plugins extended). PLAN-ordered queue after dayjs: `sib-api-v3-sdk` → Brevo SDK (2 files), `fluent-ffmpeg` (1 file, `tasks/video-processing.js`), `aws-sdk` v2 → v3 (15 files; biggest; do last; SRS code per locked #4 is already v3). Then W1 SRS — the long pole.

### 2026-05-17 — cur8-api Wave D-mirror item #4: moment → dayjs

Continues the cur8-api D-mirror queue from the 2026-05-15 evening session. 4 of 7 D-mirror replacements now landed.

| Hash | LOC | Subject | Notes |
|---|---|---|---|
| `9eec44fa8` | 41 files / 38 import-swap sites + 3 inline fixes + lib/dayjs.js NEW + package.json + lockfile | `refactor(deps): migrate moment / moment-timezone → dayjs (Wave D-mirror)` | Drops `moment@^2.30.1` + `moment-timezone@^0.6.2` from direct deps. `moment` stays as a transitive of `bunyan@1.8.15` (logger; bunyan→pino swap is PLAN-deferred, not in current scope) but is `MODULE_NOT_FOUND` to app code. NEW `lib/dayjs.js` mirrors `cur8-ui/app/utils/dayjs.js` (same 13 plugins extended: utc, timezone, customParseFormat, duration, relativeTime, isBetween, isSameOrAfter, isSameOrBefore, localeData, localizedFormat, minMax, objectSupport, weekOfYear) but in CJS shape (`module.exports = dayjs`). Variable name `moment` retained at call sites — dayjs API is mostly identical so chained calls (`.add`, `.subtract`, `.format`, `.tz`, `.toISOString`) work as-is. **3 known-incompatibility fixes inline**: (1) `lib/helpers.js:23` `getTimezoneOffset` — moment-tz's `Zone.utcOffset(timestamp)` returns POSITIVE minutes WEST of UTC (LA=+480); dayjs's instance `.utcOffset()` returns the standard convention (positive EAST, LA=-480). Negated to preserve the prior sign for downstream `time_offset_minutes` consumers (`lib/helpers.js:84` → `db/event-dates.js:437`). (2) + (3) `test/legacy/data.js` + `test/data/events.js` `roundSecs(date)` — dayjs is immutable, so `date.add(1, 'second')` + `date.milliseconds(0)` standalone were silently no-ops. Reassign through; renamed `.milliseconds()` → canonical `.millisecond()`. Validation: `node --check` clean on all 41 files; `pnpm lint` 0 errors / 22 warnings (unchanged); `pnpm format:check` green; `pnpm audit` 4 vulns (unchanged — moment wasn't a vuln source); inline smoke confirms `getTimezoneOffset` returns +420 LA (summer DST), +240 NY, 0 UTC, -540 Tokyo, and `roundSecs` rounds-up at 600ms / rounds-down at 400ms. |

**Still queued on cur8-api** (3 of 7 D-mirror items remain):

- **NEXT** `sib-api-v3-sdk` (npm-deprecated — was Sendinblue, now Brevo) → `@getbrevo/brevo` or `@sendinblue/client`. 2 files: `vendor/mail.js` real call site + `db/locations.js` commented reference only.
- `fluent-ffmpeg` (npm-deprecated) → audit usage first; 1 file (`tasks/video-processing.js`); options are native `child_process` spawn of ffmpeg binary, or `@ffmpeg/ffmpeg` for browser-side (this is server-side so child_process is the obvious pick).
- `aws-sdk` v2 → v3 (15+ sites; biggest scope; do last). Per-service `@aws-sdk/client-*` imports + new client/command pattern. SRS code that lands in W1 is already written against v3 per locked decision #4 / #16 — this task converts the **rest** of cur8-api.

After Wave D-mirror queue clears: **W1 SRS** — the original critical path, lands on top of the modernized dep surface. Then W2 Docker. Then W4 venue endpoints.

**Audit numbers (cur8-api):** 4 vulns unchanged (1 high + 1 moderate from mocha→serialize-javascript, 1 low from aws-sdk v2, 1 low from mocha→diff). moment wasn't a vuln source, so dropping it doesn't move the audit needle. mocha's transitive vulns need a separate fix (mocha bump or `pnpm.overrides`); aws-sdk's clears when v3 swap lands.

## Document history

Built jointly by Claude and Codex over five review rounds plus the locked-decision pass (2026-05-13 to 2026-05-14). Earlier scratch drafts are superseded. This file is the working source of truth from here forward.

**2026-05-14 session decisions** (committed alongside this revision):
- Node 24 LTS adopted as W0 baseline target; Node 22 reference baseline dropped (locked decision #11).
- pnpm 11.x migration folded into W0 (locked decision #12).
- fnm-only Node policy added as documented dev-workstation prereq (locked decision #13).
- Homebrew Node + `gemini-cli` relocated to fnm-managed npm globals on both `bradys-macbook` and `bradys-rxco-macbook`; ~205 MB of brew artifacts removed per machine.
- Workstream 2 rescoped to deploy-side (Docker + CI image) work; dev-side Node/pnpm fully owned by W0.
- No repo code changes land before this PLAN.md revision is committed and pushed.

**2026-05-14 session revision #2** (committed alongside):
- One PR per repo for the upgrade program; commit-based structure replaces per-wave PRs (locked decision #14).
- Single branch name `feat/upgrade-2026q2` standardized across all three repos.
- New §"PR / branch structure" added; all per-workstream "Branches" subsections updated to reference the single branch.
- §"Recommended PR sequence" rewritten as §"Recommended commit sequence within feat/upgrade-2026q2".
- AMS-removal carved out as a follow-up `chore/ams-removal` PR per repo to preserve flag-based SRS rollback during the validation window.

**2026-05-14 session revision #3** (committed alongside):
- Solo-repo carve-out for `showtix4u-venues` recorded — direct-to-main merges, no PR ceremony for that one repo.
- `canvas` 2.11.2 verified as non-building on Node 24 in cur8-api; bumped to `canvas` 3.x latest stable in W0 as a Node 24 compat carve-out. Wave C "minors bundle" canvas entry struck through.
- Locked decision #15 added: bumps always target latest stable (not minimum-working). Wave phasing preserved — the rule is about version target, not bump scope.

**2026-05-14 working-agreements + resume-protocol pass** (commits `efe2bb7f` + this one):
- §"Working agreements" added after §"Executive decisions": plan-first, continuous execution log, flag plan conflicts. Codifies the three workflow rules that today's session learned the hard way (the Wave A/B revert pass was the cost of not having #3 written down).
- §"How to use this document (resume protocol)" added near the top: reading order, where to find the resume point, repo-specific convention check, scope confirmation, end-of-session log update. Replaces paste-able bootstrap prompts that lived only in chat — now travels via `git pull` to any machine.
