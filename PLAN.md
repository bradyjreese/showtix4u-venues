# Upgrade & Venue Builder Plan

Single source of truth for the upgrade program across `cur8-api`, `cur8-ui`, and `showtix4u-venues`. Built from joint Claude + Codex convergence over five review rounds plus the locked-decision pass. All claims here have been grep-verified against the local repos as of 2026-05-14.

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

## Executive decisions (locked)

1. **Fresh branches off `staging` (api) and `dev` (ui).** Old branches are mined, not rebased.
2. **Target the Node 24 LTS line.** Node 26 is Current — not the target. Pin dev to the latest LTS patch (`24.15.0` as of 2026-05-14) and bump as patches land. Docker bases are patch-pinned per locked decision #10.
3. **pnpm 11.x via Corepack** in all three repos. Replaces npm (cur8-api) and Yarn Classic (cur8-ui). Aligns with `~/.claude/CLAUDE.md`'s "never npm/yarn" rule.
4. **Finish SRS streaming before broad dep churn.** It touches infra, runtime, and playback — moving the ground under it during package waves is risky.
5. **Baseline cleanup can run in parallel** with SRS, as long as it doesn't touch streaming files.
6. **Venue builder: draft JSON table + publish adapters.** No `venues.seating_layout` column on the existing schema — `venue_seat` has 20M rows tied to existing tickets.
7. **Keep S3 `.mst` HTML runtime during venue migration.** Generate compatible templates from publish flow; retire manual template editing later.
8. **Zero user-visible regression, with two carve-outs.** The venue builder is a new admin feature (intentional addition). The streaming player swap (`@antmedia/webrtc_adaptor` → `hls.js` via SRS) is also allowed to change visibly — different chrome, different latency profile — because the underlying tech changes. Everywhere else — Node bumps, package manager swap, dependency upgrades, dead-code purges, all Wave A–D work — must be invisible to end users. See "User-visible parity" below.

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

## Workstream 0 — Baseline & Safety Rails

**Goal**: measurable baselines + isolated low-risk fixes before bigger waves. No streaming files touched.

**Branches**:
- `cur8-api`: `chore/api-upgrade-baseline` from `staging`
- `cur8-ui`: `chore/ui-upgrade-baseline` from `dev`

**Tasks**:

0. **Environment prereqs** (one-time, no PR — completed 2026-05-14):
   - fnm installed; Node 24.15.0 set as default on both `bradys-macbook` and `bradys-rxco-macbook` (`fnm default 24.15.0`, aliased `lts-latest`).
   - Homebrew Node uninstalled on both Macs; `gemini-cli` reinstalled as `npm i -g @google/gemini-cli` under fnm-managed Node 24.15.0.
   - `which -a node` resolves to only the fnm path on both Macs. `reese-mac-mini` confirmed to have no Node installed.
1. **cur8-api `docker/test.dockerfile` Node 8.10 → 24.15.0** (patch-pinned per locked decision #10) or delete if unused — verify with CI grep. The single most embarrassing line in either repo.
2. **cur8-api `.github/workflows/eslint.yml` Node 20 → 24.15.0** (matches W0 baseline target per locked decision #11; supersedes the prior "→ 22, move to 24 in W2" plan).
3. **cur8-api: move `nodemon` to devDependencies.**
4. **Baselines** (measure only, no deletions):
   - cur8-ui: `webpack-bundle-analyzer` snapshot committed
   - both: `pnpm dlx depcheck` report saved as a clue list (not auto-delete)
   - both: `pnpm audit` saved
   - both: clean install + lint + test status documented
   - **Parity baselines** (per zero-regression principle):
     - cur8-ui: pick visual-regression tool, capture screenshots of top customer + admin screens
     - cur8-ui: current Playwright e2e suite green run as "before" reference (15 specs as of 2026-05-14)
     - cur8-api: golden fixtures — one ticket PDF, dymo label, transaction CSV, `.ics`, email HTML — to `test/fixtures/goldens/`
     - cur8-ui: render-snapshot one reserved-seating + one GA `returnCreateVenueSectionsMarkup` output
     - Streaming: recorded reference of an AMS live stream on desktop + iOS Safari
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
7. **Node 24 runtime gotcha validation** (moved from W2 per locked decision #11):
   - OpenSSL 3.x cipher behavior — TLS edge cases on outbound integrations (Stripe, Ably, Google APIs, Intuit OAuth).
   - Native `fetch` is available — drop any fetch polyfills surfaced by depcheck.
   - Webpack 5 + babel-loader compatibility on Node 24 (cur8-ui).
   - node-gyp / native deps rebuild cleanly: `canvas`, `bcrypt`, `node-canvas`.
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

**Branches**:
- `cur8-api`: `feat/srs-streaming-service` from `staging`
- `cur8-ui`: `feat/srs-hls-player` from `dev`

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

**Branches**:
- `cur8-api`: `chore/api-node24-docker` from `staging` (parallel to SRS if no file overlap; otherwise after; depends on W0)
- `cur8-ui`: `chore/ui-node24-docker` from `dev` (after HLS port is isolated; depends on W0)
- `showtix4u-venues`: no W2 work — venues-side W0 PR fully covers it.

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

**cur8-api**:
- ESLint flat config cleanup (already on v9)
- mocha, chai 4 (stay — chai 5 is ESM-only, tests are CJS), chai-http, **sinon 5 → 19**
- Test Docker modernization (covered in W0)

**cur8-ui**:
- ESLint, Prettier (^1.17 → current; major bump), Stylelint
- Jest 29 → 30 if stable, else stay; @testing-library current
- Playwright current
- Babel/Webpack loaders: drop obsolete proposal plugins (`@babel/plugin-proposal-nullish-coalescing-operator` is in syntax now)
- Keep Webpack 5 — do not combine with Vite migration

**showtix4u-venues**:
- Vite + TS + Fabric version sweep
- Builder typecheck/build green

### Wave B — Low-risk runtime patches

Patch/minor bumps with no public-behavior change. Security patches. Transitive vuln cleanup post lockfile conversion. One PR per repo.

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
| 10 | minors bundle: `config` 1 → 3, `csv-stringify` 3 → 6, `deepmerge` 2 → 4, `chokidar` 5 → 4 (deprecated tag jump), `ajv` 6 → 8, `canvas` 2 → 3, `pdfmake` 0.1 → 0.2, `google-auth-library` 7 → 9, `bcrypt` 5.0 → 5.1 | — | Low–Med | One PR |

**Also in Wave C** (locked decision #9 — moment is dead upstream, remove it everywhere):
- **API `moment` / `moment-timezone` → `dayjs`** (38 sites in cur8-api). Approach mirrors UI Wave D1: add a thin dayjs utility wrapper, codemod simple uses first, manual review for timezone arithmetic. Parity gate: every date string that appears in a user-visible artifact (ticket PDF, email, CSV, `.ics`, on-screen) gets byte-diffed via the W0 goldens before/after.

**Deferred from Wave C**:
- **Express 4 → 5** — middleware semantics change; do after Node/pnpm/SRS settle
- **`bunyan` → `pino`** — unless ops needs structured-log parity now

**Wave C parity gates**:
- `aws-sdk` v2 → v3: contract tests on error shapes that bubble to UI (S3 presigned URLs, ECS task launch envelopes, paginator shapes)
- `helmet` 3 → 8: diff response headers before/after; CSP / CORS / cookie behavior must match
- `multer` 1 → 2: upload e2e on staging for all 3 routes
- `pdfmake` 0.1 → 0.2 + `canvas` 2 → 3: regenerate ticket PDF + dymo label goldens, byte-diff the visible content
- `csv-stringify` 3 → 6: regenerate transaction CSV golden, byte-diff
- `axios` 0.21 → 1: error-shape contract tests where errors leak to UI
- `config` 1 → 3: smoke-test all deploy envs (local, dev, staging, prod) before merge
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

**Branches**:
- `cur8-api`: `feat/venue-layout-drafts` from `staging`
- `cur8-ui`: `feat/venue-builder-admin` from `dev`
- `showtix4u-venues`: stays as template archive

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

## Recommended PR sequence

1. **W0 baselines**: `chore/api-upgrade-baseline`, `chore/ui-upgrade-baseline`
2. **W1 SRS** (critical path): `feat/srs-streaming-service`, `feat/srs-hls-player`
3. **W2 Node/pnpm**: `chore/api-node24-pnpm`, `chore/ui-node24-pnpm`, `chore/venues-node24-refresh`
4. **W3 dep waves**: A (tooling) → B (low-risk) → C (api breaking) → D (UI cleanup, ordered D1–D8)
5. **W4 venue builder**: `feat/venue-layout-drafts` (api first), `feat/venue-builder-admin` (ui)

---

## Locked decisions (2026-05-14)

All 10 previously-open decisions are now answered:

1. **SRS infra ownership: CDK.** Verified `terraform/ant-media/` is the only terraform in cur8-api; it's AMS-only and gets nuked with AMS. SRS gets built fresh in CDK.
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

---

## Non-goals (this batch)

- One-shot "update everything" PR
- Vite migration
- React 19
- React Router 7
- Express 5 (until after Node/pnpm/SRS land)
- Full UI framework consolidation
- JSON-only venue model
- Deleting AMS before SRS production proof
- Tracking Node Current (26.x) — we stay on the LTS line
- Any user-visible regression outside the two declared carve-outs (venue builder, video player)

---

## Document history

Built jointly by Claude and Codex over five review rounds plus the locked-decision pass (2026-05-13 to 2026-05-14). Earlier scratch drafts are superseded. This file is the working source of truth from here forward.

**2026-05-14 session decisions** (committed alongside this revision):
- Node 24 LTS adopted as W0 baseline target; Node 22 reference baseline dropped (locked decision #11).
- pnpm 11.x migration folded into W0 (locked decision #12).
- fnm-only Node policy added as documented dev-workstation prereq (locked decision #13).
- Homebrew Node + `gemini-cli` relocated to fnm-managed npm globals on both `bradys-macbook` and `bradys-rxco-macbook`; ~205 MB of brew artifacts removed per machine.
- Workstream 2 rescoped to deploy-side (Docker + CI image) work; dev-side Node/pnpm fully owned by W0.
- No repo code changes land before this PLAN.md revision is committed and pushed.
