# Converged Plan — SRS Cutover (HLS-only) + Venue Builder Embed

**Status**: ACTIVE. Canonical execution plan. Replaces `PLAN.md` for execution. `PLAN.md` remains as the locked long-form upgrade reference, broader Wave A/B/C/D scope **paused**.

---

## 1. Why a new plan + framing constraints

`PLAN.md` is correct but too broad. We pull scope back to what actually has to ship:

1. **Finish SRS on cur8-api** — code complete, validated through dev → staging → prod, AMS preserved in-tree behind `streaming.provider` flag **only as a temporary rollback path during the validation window**. After prod-validation, AMS is removed entirely.
2. **HLS-only playback**. SRS adapts to the existing `{playback_url, playback_mode, playback_status, stream, video}` contract. Going forward, viewers watch via HLS **only** — no WebRTC. The `@antmedia/webrtc_adaptor` WebRTC playback paths in `cur8-ui` (currently in `LivestreamWatchPage` and `LibraryFilmReview`) come out as part of the cutover.
3. **Embed the venue builder** — Fabric/TS builder from `showtix4u-venues/builder/` (more advanced than the cur8-ui Konva demo per user) lands as a built JS package consumed by `cur8-ui`. Backend draft + preview ship first; publish ships after parity proof.
4. **Targeted upgrades only when they sit directly in a file we are already editing.** No proactive Wave A/B/C/D work.

Everything else in `PLAN.md` (Express 5, MUI 6, react-router 7, react-html-parser cleanup, react-redux 9, full aws-sdk v3, moment → dayjs, pnpm 11, Node 24 in CI, etc.) stays paused.

### 1.1 HLS-only for viewing; WHIP for browser publish

Two separate dimensions, easy to conflate:

- **Viewing** is HLS-only going forward. SRS will not introduce a WebRTC viewer path; viewer playback continues through the existing `/api/*/streams/:viewer_id/master.m3u8` proxy contract that already serves AMS HLS today.
- **Publishing** must continue to support both OBS (RTMP) and the browser. Today's browser publish is wired through `@antmedia/webrtc_adaptor.publish()` — confirmed in use at `LibraryFilmReview/index.js:232` (reviewer-recording feature). Going forward, browser publish is wired through **SRS WHIP** (WebRTC-HTTP Ingestion Protocol — SRS-native). The `whip-client.js` salvage from `feature/repo-upgrades` (+209 lines) becomes mandatory, not conditional.

So in PR 3 (`feat/srs-ui`):
- WebRTC **playback** codepaths (`LivestreamWatchPage` `.play()` calls, `LibraryFilmReview` WebRTC playback half) → removed.
- WebRTC **publish** in `LibraryFilmReview` (`adapterRef.publish(...)`) → swapped to WHIP via `whip-client.js`, hitting SRS WHIP endpoint instead of AMS WebRTC.
- `@antmedia/webrtc_adaptor` → removed (WHIP client replaces it).
- `AntMediaPage` demo container → deleted.

AMS HLS playback through `vendor/hls.js` remains the rollback target during the validation window. AMS WebRTC was never the canonical *viewer* path, and its publish role is replaced by WHIP in the same PR — so removal does not reduce functionality.

The compatibility contract through `vendor/hls.js` is not a commitment to keep AMS — it is the fastest way to replace AMS without also redesigning the already-working HLS playback path.

## 2. Branch reset — separate branches per workstream

Per user direction + codex v2 refinement: **SRS and venue builder are independent workstreams and get independent branches.** SRS is critical-path; venue builder is exploratory. Combining them on `feat/srs-venue` (v1/v2 design) risks blocking SRS on builder churn or vice versa.

| Repo | Workstream | Branch | Base |
|---|---|---|---|
| cur8-api | SRS | `feat/srs` | freshly pulled `origin/staging` |
| cur8-ui | SRS adaptation | `feat/srs-ui` | freshly pulled `origin/dev` |
| cur8-api | Venue builder backend | `feat/venue-builder-api` | freshly pulled `origin/staging` |
| cur8-ui | Venue builder UI | `feat/venue-builder-ui` | freshly pulled `origin/dev` |
| showtix4u-venues | Plan + builder source | `main` (solo carve-out) | — |

Old upgrade branches stay on disk as **salvage sources only**. See §8 for hygiene.

Branch creation:

```sh
git -C ~/Code/cur8-api switch staging && git pull --ff-only origin staging
git -C ~/Code/cur8-api switch -c feat/srs

git -C ~/Code/cur8-ui switch dev && git pull --ff-only origin dev
git -C ~/Code/cur8-ui switch -c feat/srs-ui

# Venue-builder branches can be created independently; rebase if staging/dev move
git -C ~/Code/cur8-api switch -c feat/venue-builder-api staging
git -C ~/Code/cur8-ui  switch -c feat/venue-builder-ui  dev
```

## 3. Verified branch inventory (2026-05-19)

### cur8-api

| Branch | Last commit | vs origin/staging | Verdict |
|---|---|---|---|
| `staging` | 2026-05-11 | 0 / -10 local stale | **New base.** `git pull origin staging` first. |
| `feat/upgrade-2026q2` | 2026-05-18 | +40 / -10 | **Primary SRS salvage source — additive files only.** Take SRS-new files (`vendor/srs.js`, `controllers/srs.js`, `db/streaming-streams.{js,sql}`, `streaming-service/`, `infra/`, ECS helpers appended to `vendor/ecs.js`, `vendor/s3.js` HLS-path support). Leave the Wave-A/D-mirror dep churn behind. |
| `feature/streaming-service` | 2026-03-30 | +4 / -163 | **Secondary salvage — surgical.** Useful: earlier SRS controller for cross-reference, newer `streaming-service/entrypoint.sh` (diff & take safe union with `feat/upgrade-2026q2`'s). **Avoid**: the +498 line `controllers/streaming.js` rewrite (older base), AMS deletions, terraform edits, `tasks/video-processing-alt*.js` (deferred — §4.7). |
| `fix/streaming` | 2026-03-25 | +5 / -165 | **Skip.** *Note*: codex v1/v2 reports "Diff size: none" for this branch — that is incorrect; real diff is 30+ files including a `vendor/hls.js` delete. But the strategic call is right (we keep `vendor/hls.js`), so no salvage. |
| `streaming-5443` | 2026-03-27 | 0 / -125 | **Discard.** Local pointer to a sync-with-staging commit. |
| `ams-vimeo-replace` | 2026-01-28 | +231 / -315 | **Skip.** AMS-only hardening. Locked decision #8. |
| `main` | 2026-03-27 | +15 / -159 | Auto-merge branch, do not touch. |
| `dev/brady` | 2025-06-13 | +237 / -719 | **Stale.** Archive tag then delete. |
| `fix/film-review-app` | 2026-01-28 | 0 / -319 | Stale, unrelated. Leave. |

### cur8-ui

| Branch | Last commit | vs origin/dev | Verdict |
|---|---|---|---|
| `dev` | 2026-05-14 | 0 / -51 local stale | **New base.** `git pull origin dev` first. |
| `feature/repo-upgrades` | 2026-03-30 | +1 / -367 | **Mostly skip.** Current `origin/dev` has a better-integrated `StreamVideoPlayer` + ReactPlayer + hls.js stack with unit tests. The Mar-30 `HlsPlayer` is stale. **Required salvage**: `app/utils/whip-client.js`, audited against the explicit SRS credential / ingress contract in §4.5 and §5.3. |
| `dev-with-upgrade-2026q2` | 2026-05-17 | +8 / -10 | **Out of scope.** Parked (§7.2). |
| `main` | 2026-05-13 | 0 / -83 | Auto-merge branch. Leave. |
| `vegas.dev` | 2026-01-27 | 0 / -734 | **Stale fork.** 1674 files of env drift, no unique commits. Discard. |

### showtix4u-venues

| Branch | State |
|---|---|
| `main` | Clean. `PLAN.md` paused-banner 2026-05-19. `builder/src/` is Fabric v7 + Vite 8 + TS 6, more advanced than the cur8-ui Konva demo (user-confirmed). |

## 4. Workstream A — cur8-api SRS (`feat/srs`)

**Strategic posture**: SRS adapts to the existing public playback contract; `vendor/hls.js` is the **compatibility boundary** (codex v2 framing — adopted). It can delegate to SRS/S3 helpers internally, but callers do not need a new playback-URL shape.

### 4.1 SRS foundation — additive

Port from `feat/upgrade-2026q2` (newest, audited):

- `db/migrations/2026-05/streaming-streams.sql` — neutral table. New table (additive, no existing rows altered), but follow the existing ops convention: take a DB snapshot before running the migration in each environment.
- `db/streaming-streams.js` — db layer. **At kickoff**: re-grep current `origin/staging:db/ams-streams.js` for actual exported method list and confirm parity (PLAN.md claimed 7, but on a different branch).
- `vendor/srs.js` — ~589 lines.
- `controllers/srs.js` — ~407 lines.
- SRS helper functions appended to `vendor/ecs.js`: take the per-stream `RunTask` / `DescribeTasks` / `StopTask` helpers, but append them beside the existing AMS helpers. Do not whole-file-rewrite or disturb staging's AMS task management.
- `vendor/s3.js` HLS-path support (appended, not replacing).
- `streaming-service/` — Dockerfile, srs.conf, docker-compose.yml, README, entrypoint.sh. **Cross-reference `feature/streaming-service`'s entrypoint.sh** — its +38 lines may include real fixes. Take the safe union.
- `infra/` — CDK package (new top-level directory).
- `docs/srs-fargate-migration-plan.md`, `docs/streaming.md`, `docs/streaming-tests.md` (SRS-relevant sections).

**Runtime model (v15 — locked rule)**: per-stream Fargate SRS tasks, exactly as the salvage branches and PLAN.md locked decision #3 designed. **One active stream = one SRS Fargate task.** Each task is sized small (1 vCPU / 2GB-class starting point, tune at PR 1) because it handles exactly one stream's ingest + ABR transcode + HLS upload. Concurrency scales horizontally by adding tasks: 50 concurrent streams = 50 SRS tasks. Stream ends → task tears down → no idle SRS runtime cost beyond the always-on router (see §4.5). Operational scale is still bounded by ECS/Fargate quotas, subnet IP capacity, public IPv4 availability/cost, security-group posture, and budget.

The salvage code is the design, not just reference material:

- `vendor/ecs.js` SRS helpers (Phase 2a) — Fargate task launch + cleanup. **Apply directly.**
- `controllers/srs.js` — "launch SRS task for this stream" is the canonical flow. **Apply directly.**
- `vendor/srs.js` — SDP helpers, S3 path generation, manifest rewriting, token validation, **plus** the task-launch wrappers. **Apply directly.**
- `db/migrations/2026-05/streaming-streams.sql` — `task_arn` column **is required** and holds the per-stream Fargate task ARN.
- `streaming-service/srs.conf` — one-task-per-stream sidecar config. Use salvage as the RTMP/HLS/transcode/hook baseline, **not** as a blind copy: current salvage config does not prove WHIP/RTC readiness. PR 1 must add/verify SRS RTC + WHIP config, expose the UDP media port, and template `rtc_server.candidate` from the task's actual public address before SRS starts. Cross-reference both `feat/upgrade-2026q2` and `feature/streaming-service`; take the safe union, then make the WHIP/RTC deltas explicit in review.

Why v11–v13 swung to shared-service and v14/v15 swing back: v11 was right that putting per-stream tasks **behind one shared NLB target group** breaks stream identity. That's not the same as "per-stream tasks are wrong" — the original PLAN.md design explicitly solved this with a stream-aware **router service** (§4.5). v11 wrongly read the routing problem as un-solvable in PR 1–3 and pulled back to a single-instance shared service that caps concurrency at one box. The user-confirmed rule is small per-stream SRS tasks: the router may be shared, SRS may not. v15 makes that non-negotiable.

### 4.2 Callback routes

```
POST /api/public/srs/on-publish
POST /api/public/srs/on-unpublish
POST /api/public/srs/on-hls
POST /api/public/srs/on-play
POST /api/public/srs/validate-publish
```

Every callback uses `validateCallback`. Both RTMP (OBS) and WHIP (browser) publishers hit `on-publish` / `validate-publish` — SRS abstracts the ingest protocol on this surface. If route prefix changes, update `streaming-service/srs.conf` and ECS callback-URL generation in the same commit.

Important boundary: callbacks validate publishing *after* traffic reaches SRS. They do not solve browser reachability. WHIP needs public HTTPS signaling plus reachable RTC media before callback validation is useful.

### 4.3 `vendor/hls.js` + `controllers/hls.js` — extend as compatibility boundary

Confirmed on `origin/staging`:
- `controllers/streaming.js:135 const playback_url = hls.createPlaybackUrl(...)`.
- `controllers/hls.js:18 const hls_format = stream_path.endsWith('_adaptive.m3u8') ? 'ams' : 'cur8'` — already provider-aware switch.

Edits:

- `vendor/hls.js`: add SRS manifest-key resolution. Live `SRS/{streamId}/{streamId}_master.m3u8`, status-aware archived path after finalization. Split the hard-coded `ant_media.aws_key` / `ant_media.s3_bucket` S3 client config — either resolve client by `hls_format` or thread provider through the fetcher. **Do not break AMS S3 reads.**
- `controllers/hls.js`: add `srs` branch alongside `ams` / `cur8`. Variant manifest path-replacement gets an equivalent for SRS naming.
- Preserve playback error shapes (`stream-not-started`, `stream-load-error`) so cur8-ui parsing keeps working.
- Provider-neutral fields preferred on the API over UI branching (codex v2 framing).

### 4.4 `controllers/streaming.retrieveAndStoreStreamInfo` — adapt in place

**Do not** port `feature/streaming-service`'s +498 line rewrite (older base assumption). Instead:

- Small provider resolver around `streaming.provider`. **During rollout**, default to `'ant-media'` when unset (rollback target). **Target end-state after validation**: default flips to `'srs'`, then AMS is removed in a dedicated follow-up PR (§10 step 8).
- Inside `retrieveAndStoreStreamInfo()`, branch on resolved provider:
  - `ant-media` → existing path, untouched.
  - `srs` → load/insert `streaming_streams` row, **`RunTask` a new per-stream SRS Fargate task** via `vendor/srs.js` + `vendor/ecs.js` (or reuse if one is already running for this stream), record the task ARN + private IP + public-addressability info in `streaming_streams` and in Redis (`streamId → {taskArn, taskPrivateIp, taskPublicAddr}`), build `playback_url` via extended `hls.createPlaybackUrl` with SRS `stream_path`.
- Return the **same top-level shape** for both providers: `playback_url`, `playback_mode`, `playback_status`, `stream`, `video`.

### 4.5 Scheduled streams + ingest routing (RTMP + WHIP)

- `tasks/scheduled-streams.js`: port **only** the SRS-specific provider-gated logic from `feature/streaming-service`'s +83/-39 diff. Do not restructure AMS scheduled-stream code. SRS task cleanup/finalization must not fire against AMS streams.
- **Ingest publish routing is the long pole.** Per-stream Fargate SRS tasks mean each stream gets its own task. Browsers and OBS still hit a single public hostname per environment; routing the right connection to the right task requires a stream-aware router service (PLAN.md locked decision #3). L4 load balancers don't inspect stream-id; L7 ALB rules can't match RTMP or UDP. The router is the only place that knows `streamId → task` mapping. v14 restores the router service into PR 1 scope.
- **Router service** (always-on, separate from per-stream SRS tasks):
  - ECS service with desired-count 1 (not standalone `RunTask`) running a Node proxy (JS-stack consistency per PLAN.md locked decision #3). Sized small (0.25–0.5 vCPU). Public hostname behind NLB. It is a router/proxy only; it never runs SRS and never owns stream media processing.
  - **Availability posture**: single-instance with ECS auto-replacement on task failure (~30–60s recovery). During that window:
    - No new streams can start (RTMP handshake and WHIP signaling both need the router).
    - **Active RTMP publishes break** — RTMP is a long-lived TCP connection proxied through the router for the stream's full duration. OBS will need to reconnect once the router is back. Worth flagging for the validation gate.
    - **Active WHIP publishes survive** — UDP RTC media flows browser → per-stream task public IP directly, bypassing the router after the initial SDP exchange. The router being down does not interrupt media already in flight.
    - **HLS playback survives** — viewer playback goes through cur8-api → S3, not through the router at all.
  - Acceptable for first-live given the recovery window. If the RTMP-disconnect risk becomes a real problem (long-running OBS events), raise to desired-count 2 + per-stream-id consistent hashing in a follow-up — not in PR 1–3.
  - Maintains the Redis `streamId → {taskArn, taskPrivateIp, taskPublicAddr}` lookup. Written by `controllers/srs.js` on `RunTask`, deleted on stream tear-down.
  - **RTMP**: accepts `rtmp://srs.<env>.cur8.com/<app>/<stream_id>` on TCP 1935, reads `<stream_id>` from the RTMP `publish` command, looks up the per-stream task, then proxies the long-lived TCP stream to that task's private IP. This is not a generic `net.pipe`: merge gate includes RTMP handshake/publish parser coverage, backpressure/timeout behavior, and Redis miss/stale-task failure tests.
  - **WHIP signaling**: receives `https://srs.<env>.cur8.com/<app>/<stream_id>/whip` after the chosen ingress TLS shape (default: NLB terminates TLS and forwards plaintext HTTP to the router), reads `<stream_id>` from the path, and proxies the SDP-offer HTTP body to the per-stream task's private IP. The router translates the public route to SRS's native endpoint, e.g. `http://{taskPrivateIp}:1985/rtc/v1/whip/?app=<app>&stream=<stream_id>`, and applies the agreed token transport exactly once (`Authorization: Bearer <token>` forwarded or `token=<stream_publish_token>` appended, matching §4.5 credential contract + §5.5 WHIP tests). It must never expose the task private IP to the browser. Task's SDP answer (returned via the proxy) includes the **per-task public UDP candidate** — see addressability below — so the browser's subsequent UDP media flows direct-to-task, never traversing the router. Merge gate includes exact path-translation tests, SDP pass-through tests, and CORS/preflight tests.
  - Surfaces structured logs + a `/health` endpoint for the router-target-health alarm.
- **Per-task UDP addressability** (PR 1 decision §12.6). Each per-stream task must advertise a public UDP candidate the browser can reach. Three real options:
  - (a) **EIP per task** — assign an Elastic IP at `RunTask` time. True per-task isolation. Limit: default 5 EIPs per region (raise via support). EIP allocation adds latency to stream-start. Cleanest but caps concurrency hard until the limit is raised.
  - (b) **awsvpc public-IP-on-task** — Fargate launched in a public subnet with `assignPublicIp: ENABLED`. AWS auto-assigns a public IP. This avoids EIP allocation latency and EIP quota pressure, but it still requires public-subnet IP capacity, public IPv4 cost review, tight security groups, and ECS/Fargate quota review. **Recommended default** unless PR 1 finds a concrete security/isolation blocker.
  - (c) **Shared NLB with UDP target group per task** — NLB UDP listener fans out to per-task target groups. NLB supports UDP, but target-group churn at stream-launch rate could hit limits. More complex than (b) with no clear win.
  - Pick (b) for first-live unless a concrete blocker exists. PR 1/2 must implement a real task address resolver, not reuse `getSrsTaskPrivateIp` for public URLs: `DescribeTasks` finds the task ENI/private IP, then EC2 `DescribeNetworkInterfaces` resolves `{privateIp, publicIp/publicDns, networkInterfaceId}` from the ENI association. Store both addresses in Redis as `streamId → {taskArn, taskPrivateIp, taskPublicAddr}`. If no public candidate is available, return `ingest_ready: false` and no `whip_url`.
  - **Resolver placement + IAM**: AWS/ECS network-address helpers live in `vendor/ecs.js`, beside `launchSrsStreamTask`, `getSrsTaskPrivateIp`, and `stopSrsTask`, not in `vendor/srs.js`. PR 1 lands the resolver as an inert utility with mocked-SDK unit tests. PR 1 IAM must include `ecs:RunTask`, `ecs:StopTask`, `ecs:DescribeTasks`, `iam:PassRole` for the SRS task/execution roles, and `ec2:DescribeNetworkInterfaces` for the cur8-api role that launches/polls tasks.
  - **`rtc_server.candidate` injection mechanism**: the default awsvpc public-IP path cannot pass the public candidate as a `RunTask` task override, because AWS assigns the public IP only after task launch. The per-stream task's `entrypoint.sh` must resolve its own public address **before SRS starts**:
    1. **Fetch task metadata** from `${ECS_CONTAINER_METADATA_URI_V4}/task` (the `/task` suffix is required — the bare `$ECS_CONTAINER_METADATA_URI_V4` returns container-only metadata, not task-level network info). Parse `Containers[].Networks[]` for the task's private IPv4 address and MAC. Fargate v4 task metadata does not return an ENI ID field directly.
    2. **Resolve region** before any AWS CLI call: derive from `AvailabilityZone` in the same task metadata (strip the trailing letter, e.g. `us-east-1a` → `us-east-1`) or set `AWS_REGION` / `AWS_DEFAULT_REGION` as a static env on the task definition. AWS CLI calls without a region fail.
    3. **Resolve the ENI + public IP** via `ec2:DescribeNetworkInterfaces` using the task role. **Prefer filtering by MAC address** (`--filters "Name=mac-address,Values=<mac>"`) because MAC is globally unique and the task metadata exposes it directly; private IPv4 alone is ambiguous across VPCs in the same region. If the MAC path is unavailable for any reason, fall back to `"Name=addresses.private-ip-address,Values=<privateIp>"` **combined with `"Name=vpc-id,Values=<vpcId>"`** (and/or `subnet-id`) so the filter resolves to a single ENI. Read `Association.PublicIp` (or `Association.PublicDnsName`) from the result. AWS CLI's `--query`/`--output text` flags handle the parse without `jq`.
    4. **Template `rtc_server.candidate`** into `srs.conf` on disk with the resolved public address, then exec SRS.

    PR 1 IAM grants the SRS task role `ec2:DescribeNetworkInterfaces` scoped as tightly as AWS supports. Do not rely on SRS config-reload-after-startup — that creates a race between the first WHIP attempt and the reload. Salvage `streaming-service/entrypoint.sh` already uses environment-driven templating and the salvage Dockerfile already includes AWS CLI + curl; PR 1 extends that startup path to cover `rtc_server.candidate`.
  - **Security group split**:
    - Router service SG: accepts public TCP `443` (WHIP HTTPS at the NLB listener) and public TCP `1935` (RTMP).
    - Per-stream SRS task SG: accepts TCP `1935` **from the router SG only** (RTMP forwarded by the router) and TCP `1985` **from the router SG and from the cur8-api/app SG** (router forwards WHIP signaling; cur8-api runs the §4.5 readiness probe + sweep `DescribeTasks` chase against `/api/v1/versions` from outside the router SG). These task TCP ports must not be world-open even though the task has a public IP.
    - Per-stream SRS task SG: accepts public UDP only on the chosen RTC media port/range (default SRS UDP media port from PR 1).
    - Effect: clients cannot bypass the router for RTMP or WHIP, browser UDP media reaches the advertised candidate, and cur8-api can reach SRS's HTTP API for readiness and sweep checks without round-tripping through the router. Gate 12 (§4.9) verifies the public-bypass refusal; an additional smoke check should confirm the cur8-api → task `:1985` probe succeeds in dev before §4.5 readiness is considered wired.
- **Per-stream task lifecycle**:
  - **Create**: API stream-creation flow → `RunTask` (small spec, 1 vCPU / 2GB starting point) → poll `DescribeTasks` + `DescribeNetworkInterfaces` until task is `RUNNING`, an ENI public-IP association is present, and SRS is ready. Readiness has two signals, both required to pass before returning `ingest_ready: true`:
    - **Primary**: `healthStatus === HEALTHY` from `DescribeTasks`. The **ECS task definition's container definition must include a `healthCheck` block** (`command: ["CMD-SHELL", "curl -fsS http://localhost:1985/api/v1/versions || exit 1"]`, `interval`, `timeout`, `retries`, `startPeriod`). This is mandatory — it is the only way ECS populates `healthStatus`.
    - **Secondary verification**: a private VPC health probe from cur8-api to `http://{taskPrivateIp}:1985/api/v1/versions` returns 200. This is a belt-and-braces check, not an alternative to the ECS check. It catches the window where ECS `healthStatus` is still `UNKNOWN` during early startup but SRS is actually serving, and it independently verifies the cur8-api → task SG path that gate 12 sub-checks (so a misconfigured SG fails readiness loudly instead of silently hanging on the ECS-only signal).

    A Dockerfile `HEALTHCHECK` is **not used by ECS for status reporting** (ECS uses task-definition checks; image-level `HEALTHCHECK` is ignored unless mirrored in the container definition). It is **optional**, useful only for local `docker run` parity. Either way, the per-stream task image **must include `curl`** so the task-definition check can exec. Only after all three readiness conditions are true may cur8-api write Redis + `streaming_streams.task_arn` + addressability and return `whip_url` / `rtmp_url` / `ingest_ready: true`. **On polling timeout**: record `task_arn` if known, call `StopTask` immediately when a task ARN exists, remove any partial Redis mapping, mark `streaming_streams.status = 'launch_failed'`, emit a task-launch-failure CloudWatch metric, and surface `ingest_ready: false` with no `whip_url` to the caller. If `StopTask` itself fails, leave `status = 'launch_failed'` with the task ARN for the sweep safety net and alarm on the failed cleanup.
  - **Active**: SRS callbacks (`on_publish`, `on_hls`, `on_unpublish`) hit cur8-api with the stream_id. `streaming_streams` is the system of record.
  - **Tear down**: on `on_unpublish` OR a 30-minute idle timeout watcher OR explicit admin stop → `StopTask` → remove Redis entry → mark `streaming_streams.status = 'finalized'`.
  - **Orphan + stale launch cleanup**: if a per-stream Fargate task dies unexpectedly without firing `on_unpublish` (Fargate platform failure, OOM, container exit), `streaming_streams.task_arn` + Redis entry would point at a dead task. PR 2 includes a periodic sweep job (every 1–5 min, cron or task watcher) that calls `DescribeTasks` against all non-terminal `streaming_streams` rows **and** `'launch_failed'` rows that still have a `task_arn`. For active non-terminal rows, tasks reporting `STOPPED` or missing get their `streaming_streams.status` flipped to `'orphaned'` and their Redis entry removed. For `'launch_failed'` rows, `STOPPED` or missing confirms cleanup; remove Redis and keep `'launch_failed'` for support traceability. Stale `'launch_failed'` rows whose task later reaches `PENDING` / `RUNNING` after the API timeout are cleanup failures, not usable streams: call `StopTask`, remove Redis, keep `'launch_failed'`, and emit the stale-launch-cleanup metric. Because `streaming_streams.stream_id` is unique, retry must be explicit: if a later create/retry asks for the same `stream_id` and finds an `'orphaned'` or `'launch_failed'` row, update that existing row in place (`status = 'created'` / `'initializing'`, new `task_arn`, refreshed timestamps, fresh Redis mapping) rather than inserting a duplicate. If the product flow intentionally wants a new stream identity after an orphan, generate a new `stream_id` and leave the old row as audit history.
  - **Idle cost when no streams active**: just the always-on router task. All SRS runtime cost is per-stream and tracks usage; scale-out is horizontal but bounded by AWS service quotas, subnet IP capacity, public IPv4 availability/cost, and budget.
- **Publish callback semantics in the per-stream model**: callback receives the stream_id from SRS. cur8-api validates the publish token against `streaming_streams` (token matches, stream is in an acceptable state, not already publishing), returns authorize/deny, and does not assume SRS includes a task ARN in the callback. Default identity sanity check: callback shared secret + token + stream state are mandatory; compare callback source private IP to the Redis `taskPrivateIp` only if the networking path preserves the SRS task source IP. If task identity must be cryptographically enforced, the SRS entrypoint must read ECS task metadata and template a signed task identity into the callback query before SRS starts. Do not implement a `task_arn` equality check unless the callback actually carries that value.
- **Public ingress transport shape**: default first-live shape is one NLB with a TLS listener for HTTPS WHIP signaling that terminates TLS at the NLB and forwards plaintext HTTP to the router, plus a TCP 1935 listener that passes RTMP to the same router task. If PR 1 chooses router-terminated TLS instead, say so explicitly and update router code/tests/certs in the same PR. UDP for RTC media bypasses the NLB entirely — flows browser → per-task public IP directly. **ALB alone is not sufficient** — it cannot carry RTMP-as-TCP-passthrough cleanly and cannot carry UDP at all (though UDP isn't routed through the NLB here either; the constraint applies if anyone tries to route RTC media through the ingress LB).
- **CORS allow-list for WHIP ingress** is a concrete config item, not a smoke-test bullet: include cur8-ui origins for dev, staging, and prod. Validate at ingress kickoff that `OPTIONS` preflight from each cur8-ui origin returns 204 with the expected `Access-Control-Allow-*` headers before wiring the cur8-ui WHIP client.
- **DNS + TLS cert for the router hostname** are part of the PR 1 ingress construct, not implementation afterthought. Pick the public hostname before PR 1 (suggested: `srs.<env>.cur8.com` matching existing env-naming convention). PR 1 preflight: confirm which AWS account owns the public hosted zone / delegated env zone, confirm the deployment role can create Route53 records, and confirm ACM DNS validation can be automated for the chosen FQDN. The CDK construct provisions the Route53 record + ACM cert + NLB listener binding alongside the router service only after that ownership/delegation path is known.
- **TURN/STUN reachability** — browsers do not provide a reliable public STUN default; `whip-client.js` must explicitly configure the chosen STUN servers (salvage currently hardcodes `stun:stun1.l.google.com:19302`, replace/configure as appropriate). Public STUN is enough for most networks, but restrictive corporate/venue networks can require TURN. Not on PR 1's critical path: the reviewer-recording flow (`LibraryFilmReview`) typically runs from home or office Chromium. Validate during PR 2 manual smoke; if a required reviewer environment fails to reach the per-stream task's public UDP candidate, escalate to add a TURN server (coturn on the existing infra or a managed service) before prod cutover.
- **Recurring infrastructure cost note**: use AWS Pricing Calculator during PR 1 cut. Baseline = always-on router task + NLB (LB-hours + NLCU + public IPv4 + data transfer). Per-stream cost = small Fargate task hours × concurrent streams × duration. Per-stream wins on cost at low concurrency (zero streams = router only) and is cost-linear with usage at scale.
- **CloudWatch monitoring + alarms** are split across infrastructure and emitting code. PR 1 CDK provisions the log groups, metric filters, **router target-health alarm** (the only critical always-on component — if the router is down, no streams can start), and alarm scaffolding for later custom metrics. PR 2 adds the API/container structured log and custom-metric emissions for per-stream task launch success/failure, publish, unpublish, HLS upload, archive build, and stale-stream cleanup (30-minute idle timeout). Missing-HLS alarms must be gated by a per-stream active-stream signal (`active_srs_streams > 0` and `hls_segments_uploaded == 0` for N minutes per stream) to avoid false alarms when no stream is live. A per-stream task-launch-failure rate alarm tracks `RunTask` health.
- **SRS film-review credential contract**: `GET /library/:id/stream-credentials` keeps `stream_publish_token`, and for `streaming.provider = srs` adds `{stream_id, whip_url, rtmp_url, ingest_ready}`. `whip_url` is a fully resolved public HTTPS URL pointing at the router (router routes by stream_id in the path) — generated only when the per-stream Fargate task is RUNNING + healthy + has a public UDP candidate. Otherwise `whip_url` is `null` with `ingest_ready: false` so the UI can show "stream ingest not ready" and retry. The token transport is one explicit choice per config — either `Authorization: Bearer <stream_publish_token>` or token-in-query — and `whip-client.js`, SRS config, and tests must match.
- No prod cutover until both OBS RTMP publish AND browser WHIP publish work end-to-end, with HLS playback flowing through the existing cur8-api HLS proxy in both cases.

### 4.6 AWS SDK v3 — scoped

SRS new code uses `@aws-sdk/client-s3` + `@aws-sdk/client-ecs` + `@aws-sdk/client-ec2` + `@aws-sdk/s3-request-presigner` natively (`client-ec2` is required by the address resolver per §4.5 — `DescribeNetworkInterfaces` lives in the EC2 client, not the ECS client). The rest of cur8-api stays on `aws-sdk` v2 (the broader migration on `feat/upgrade-2026q2` is parked per §7.1).

### 4.7 Explicitly out of scope on `feat/srs`

- `tasks/video-processing-alt.js` (+316) + `video-processing-alt-broll.js` (+299). Confirmed SRS-side via `streaming.aws_key` config, but not on the critical path for first-live. Deferred to a follow-up.
- `routes/security/index.js` refactor from `feature/streaming-service`. Useful but independent. Defer.
- `controllers/streaming.js` wholesale rewrite from `feature/streaming-service`. Adapt staging's controller instead (§4.4).
- Full aws-sdk v2 → v3 outside the SRS code path.
- `add-task-arn-to-ams-streams.sql`-style salvage. SRS uses its own table (codex agrees).
- Node version bump in `docker/*.dockerfile` or `.github/workflows/*.yml`.
- `package-lock.json` → `pnpm-lock.yaml` swap.
- Lint/format swap (oxlint, oxfmt, prettier).
- Deleting `vendor/ant-media.js` / `controllers/ant-media.js` — stays until SRS prod-validates.

### 4.8 API tests

Unit:

- Callback token validation per endpoint, including callback source-identity behavior from §4.5: source-private-IP match when preserved, explicit signed task identity if that path is chosen, and no blind `task_arn` equality check unless the callback carries the ARN.
- Provider resolution (`streaming.provider` → `srs` | `ant-media`, default `ant-media`).
- SRS stream path generation (live + status-aware archived).
- HLS key resolution for AMS, SRS live, SRS archived, uploaded VOD.
- `streaming_streams` lifecycle (mirroring `ams-streams.js` methods).
- Rollback: with `streaming.provider` unset, `retrieveAndStoreStreamInfo` byte-identical to current staging.
- SRS film-review credential response: public `whip_url` generated only when the per-stream SRS task is running, SRS/container health is ready, the router route exists, and the task public UDP candidate is known; no private task IP leaked to the browser; token/header/query convention matches `streaming-service/srs.conf`.
- Router contract: RTMP publish-command stream-id extraction, WHIP public-path → SRS-native `/rtc/v1/whip/` translation with exact token transport, WHIP SDP pass-through, Redis miss/stale mapping behavior, long-lived TCP backpressure/timeout handling, and CORS preflight for WHIP.
- Address resolver + ingest readiness (in `vendor/ecs.js` / `controllers/srs.js` per §4.5): mocked `DescribeTasks` + `DescribeNetworkInterfaces` SDK clients, verify `{privateIp, publicIp/publicDns}` extraction from the ENI association, verify missing-public-IP path returns the resolver's "no public candidate" signal (and the caller surfaces `ingest_ready: false`), verify `RUNNING` + public IP but unhealthy SRS does **not** return URLs, verify healthy SRS does return URLs, and verify polling cap / timeout behavior calls `StopTask`, records `'launch_failed'`, clears partial Redis, and emits the task-launch-failure metric.
- Orphan + stale launch sweep (PR 2 cron): mocked active non-terminal row with `DescribeTasks` returning `STOPPED` or missing task → `streaming_streams.status` flips to `'orphaned'`, Redis entry removed; mocked `'launch_failed'` row with `STOPPED` / missing task → Redis cleanup and status remains `'launch_failed'`; mocked stale `'launch_failed'` row with `PENDING` / `RUNNING` task → `StopTask`, Redis cleanup, stale-launch-cleanup metric, status remains `'launch_failed'`; on retry against the same `stream_id`, the existing orphaned/launch_failed row updates in place (status, task_arn, timestamps) rather than inserting a duplicate; if product flow chooses a new `stream_id`, the old row stays as audit history (per §4.5 retry semantics).

Smoke (manual):

- OBS publish through intended public endpoint.
- Browser WHIP publish through the public HTTPS endpoint, including ICE/media connectivity and SRS callback validation.
- Patron / admin / client HLS playback through `/api/*/streams/:viewer_id/master.m3u8` proxy.
- Stream finalization → archived manifest path.
- Multi-concurrent streams, no cross-routing.
- AMS → SRS flip and SRS → AMS playback rollback (config-only). Browser-publish rollback after PR 3 requires PR 3 revert / emergency flag per §5.3.

### 4.9 Validation gates

1. OBS publishes through public RTMP endpoint.
2. **Browser publishes through public SRS WHIP endpoint** (validated against the same `stream_publish_token` flow `LibraryFilmReview` uses today, with no private task IP in the browser URL; router translates the public WHIP route to SRS's native `/rtc/v1/whip/` endpoint and preserves the agreed token transport).
3. API validates publish token + maps to SRS task for both ingest protocols; callback source identity follows §4.5 and does not rely on a task ARN unless explicitly templated into the callback.
4. SRS produces 1080/720/480 ABR HLS.
5. Segments + playlists reach S3.
6. cur8-api serves/proxies playlists + signed segment URLs.
7. cur8-ui plays live HLS on desktop Safari / Chrome / Firefox **+ iOS Safari** (native HLS path).
8. Scheduled / pre-recorded flow.
9. Multi-concurrent without cross-routing (mix of RTMP + WHIP publishers).
10. Stream end → archived VOD behavior.
11. AMS-HLS rollback documented + tested before prod flip.
12. **Security-group bypass negative test**: from an untrusted/public host (one **not** in the router SG and **not** in the cur8-api/app SG), direct TCP connections to a per-stream task's `1935` (RTMP) and `1985` (SRS HTTP API) are refused at the SG layer. Verifies the §4.5 SG split prevents clients from skipping the router while preserving the legitimate cur8-api → task `:1985` readiness/sweep path. Positive sub-checks on the same ruleset: (a) cur8-api → task `:1985` succeeds, (b) browser UDP RTC media to the advertised candidate port succeeds, (c) router → task `:1935` and `:1985` succeed.
13. **Launch-timeout cleanup test**: force a task that reaches `RUNNING` only after the ~30s readiness cap. API returns `ingest_ready: false` with no URLs, records `'launch_failed'`, calls `StopTask` when possible, leaves no Redis route, and the sweep stops any late-running stale task.

## 5. Workstream B — cur8-ui SRS adaptation (`feat/srs-ui`)

**Strategic posture**: current `StreamVideoPlayer` on `origin/dev` already handles HLS via ReactPlayer + hls.js with quality selection, error parsing, and unit tests. **No new player. No new WebRTC viewer path.** Per HLS-only-viewing directive, the existing WebRTC playback codepaths come out in this branch. Per "no functionality loss" directive, the existing WebRTC publish role (`LibraryFilmReview` reviewer recording) is swapped to SRS WHIP. `@antmedia/webrtc_adaptor` is replaced by the WHIP client and removed.

### 5.1 What stays

- `StreamVideoPlayer/index.js` + tests.
- `StreamPlayer/index.js`.
- The current `getPatronStreamAccess(code)` → `{playback_url, playback_mode}` → ReactPlayer flow.

### 5.2 SRS adjustments

- **Readiness states**: handle any new `playback_status` values SRS returns (`ingest_ready`, `publisher_pending`, `stream_initializing`, etc.) as provider-neutral status copy. Prefer API field additions over UI branching.
- **Admin/client publish-detail views**: where AMS-style publisher details are rendered, add SRS RTMP URL + stream key when the resolved provider is SRS.
- **iOS Safari native HLS verification** (validation, not code change).
- **Provider-neutral viewer copy**: scrub any "Ant Media" / WebRTC / sub-second latency wording in touched files.
- **Do not add WebRTC viewer UI for SRS.** Viewing is HLS-only.

### 5.3 WebRTC adaptor swap — playback removed, publish replaced with WHIP

Two changes happen together in `feat/srs-ui` so the `@antmedia/webrtc_adaptor` dep can come out in one PR without losing functionality.

**WHIP client port (mandatory, replaces `@antmedia` publish role)**:

- Port `app/utils/whip-client.js` (+209) from `feature/repo-upgrades`, but audit it against §4.5 rather than copying the salvage contract blindly. The helper must accept the public `whip_url`, use the agreed token/header/query convention, send SDP to the SRS WHIP ingress, retain `turnOnLocalCamera()`, `stop()`, and `switchCamera()` behavior, and surface publish-started / publish-finished / error callbacks that map to the existing UI states.
- `app/components/Library/LibraryFilmReview/index.js`:
  - Line 232 (`webRtcAdapterRef.current.publish(oneLibrary.stream_id, response.stream_publish_token)`) → replace with WHIP client call. The cur8-api response keeps `stream_publish_token` and adds `whip_url` / `ingest_ready` for SRS; the UI must block/retry when `ingest_ready` is false.
  - Keep `getUserMedia` calls (lines 111, 136, 154) — they capture the local MediaStream, which WHIP consumes the same way the adaptor did.
  - Remove the WebRTC playback half (the file already has a working hls.js path at lines 760, 879).
- `app/components/Library/LibraryFilmReview/indexTest.js`: current `origin/dev` has no import/reference to this file and Jest does not match it (`testRegex` only covers `__tests__/.*\.test\.js$`). Default: delete it during PR 3 after confirming with the film-review owner that it has no manual/dev runtime use. Only port it to WHIP if the owner identifies a real use.

**WebRTC playback removal (no replacement needed — HLS already handles viewing)**:

- `app/containers/Library/LivestreamWatchPage/index.js`: remove `import { WebRTCAdaptor }` at line 3 and the `webRtcAdapterRef.current.play(...)` calls at lines 130, 182, 186. Replace `playStream()` with the existing HLS playback path — `getPatronStreamAccess` already provides the contract.
- `app/containers/Demo/AntMediaPage/index.js`: demo. Delete container + route registration.

**Package + grep check**:

- `package.json`: remove `@antmedia/webrtc_adaptor`. After the WHIP swap + playback removals, grep `@antmedia` must return empty before merge.

**Rollback matrix**:

- Viewer rollback: AMS HLS playback through `vendor/hls.js` + `/api/*/streams/:viewer_id/master.m3u8` continues to work for users on `streaming.provider = ant-media`.
- Browser publish after PR 3: reviewer recording is SRS WHIP only. There is intentionally no AMS WebRTC publish fallback once `@antmedia/webrtc_adaptor` is removed.
- Merge gate: browser WHIP must be green in dev before PR 3 lands. If a same-day rollback of browser publish is required, revert PR 3 or keep the adaptor behind a short-lived emergency flag; do not assume `streaming.provider = ant-media` restores browser publish.
- Confirm at PR review time that no flow depends on AMS being both the ingest and playback source simultaneously.

### 5.4 UI touched-surface checklist

Walk every surface touched by `feature/repo-upgrades` and verify current `origin/dev` works under both `streaming.provider` values:

- Patron stream page (`containers/Stream`)
- Library livestream watch page (`containers/Library/LivestreamWatchPage`) — gets the WebRTC removal
- Event stream preview/credentials (`components/Event/EventStream`, `EventStreamCredentials`)
- Scheduled item stream controls (`components/Schedule/ScheduledItemStream`)
- Support streaming list (`containers/CUR8Support/StreamingList`)
- AMS support page (`containers/CUR8Support/AMS`) — kept as-is (admin tooling for AMS rollback window)
- Library film review (`components/Library/LibraryFilmReview`) — gets the WebRTC removal

### 5.5 WHIP testing harness

- Add a unit test that constructs the WHIP client with a fake `MediaStream` + token and asserts the expected public SRS WHIP endpoint URL + agreed token transport (Authorization header or token-in-query). (Mirror the existing `StreamVideoPlayer.test.js` patterns — mock the fetch boundary, not the WebRTC primitives.)
- Manual: from a Chromium browser on dev, exercise the film-review reviewer-recording flow end-to-end against the SRS dev stack. Confirm the recorded stream lands in S3 archive per the SRS finalize callback.
- Manual: iOS Safari + Firefox compatibility check on WHIP publish (`getUserMedia` + WHIP is well-supported but verify on the actual reviewer hardware mix).

### 5.6 Explicitly out of scope on `feat/srs-ui`

- Router 7 / class→function / oxfmt / dep-pin sweep from `dev-with-upgrade-2026q2`.
- MUI / react-redux / react-router / react-pdf upgrades.
- moment → dayjs.
- yarn → pnpm.
- Node `.nvmrc` / `engines.node` bump.
- TypeScript adoption (venue builder embeds as built JS — see §6).
- Deleting `StreamVideoPlayer/`, `app/utils/stream.js`, `app/hooks/useStreamAccess.js`, `ReservedSeating_konva.js` — alive on `origin/dev`, not redundant.

### 5.7 UI validation

Playback:

- Mock `getPatronStreamAccess()` returning an SRS `playback_url` + `playback_mode: 'live'` → StreamVideoPlayer plays, error states correct. Add to existing test suite.
- Manual: desktop Safari / Chrome / Firefox against live SRS dev stream.
- Manual: iOS Safari native HLS.
- Manual: stream-not-started / offline error display unchanged.
- Manual: admin + client setup pages show SRS publishing details under `streaming.provider = srs` and AMS publishing details under `ant-media`.
- Manual: under `streaming.provider = ant-media` (rollback), AMS HLS playback in `LivestreamWatchPage` and `LibraryFilmReview` still works exactly as on current `origin/dev` — post WebRTC removal, only the HLS half is exercised.
- Visual checks on the touched streaming surfaces under both provider values.

Browser publish (WHIP):

- Unit: WHIP client constructs the correct ingest URL + agreed token transport from a `stream_publish_token` (see §5.5).
- Manual: full film-review reviewer-recording flow on Chromium against SRS dev — record, stop, confirm archive lands in S3.
- Manual: iOS Safari + Firefox cross-browser check.
- Manual: confirm publish-token reuse and stop/restart cycles do not leak stream state, Redis entries, or archive/finalization jobs.

## 6. Workstream C — Venue builder

### 6.1 Source-of-truth: Fabric builder (user-confirmed)

User direction: the Fabric/TS builder in `showtix4u-venues/builder/` is **more advanced** than the existing Konva demo in cur8-ui (`app/containers/Demo/SeatingChartBuilderPage/`). The Fabric builder is the source of truth. Locked decision #5 (compile-and-embed) stands.

The cur8-ui Konva demo is **reference material only** — useful for `.mst` rendering helpers (it imports `utils/locations.js:returnCreateVenueSectionsMarkup`) and as a parity reference for what the current customer-facing render path expects. Not a competing implementation. Removal of the demo is a later cleanup, not in scope for this plan.

### 6.2 Backend draft API — `feat/venue-builder-api`

Branch off `origin/staging`. The venue-builder workstream is fully independent of SRS — there is no code overlap, so PR 4 does not have to wait for PR 1 to merge. Sequence in §9 / §10 is informational, not a blocker. If PR 1 lands first and `origin/staging` advances, rebase `feat/venue-builder-api` on the new head.

#### 6.2.0 Legacy API preservation (principle)

**No existing venue endpoint contract gets replaced, extended, or repurposed by this workstream. All new behavior lives on net-new endpoints; existing endpoints keep their current request/response shapes and runtime path. New routes may be added to the same `routes/api/locations.js` router file.**

Untouched in this plan:

- `GET /locations/:id/layout` — keeps serving the existing relational layout JSON + `id_map` from `db.venues.getLayout`. It does **not** fetch `.mst` templates today; cur8-ui separately reads `${REACT_APP_VENUE_URL}${location.id}.mst` from S3. Works identically for legacy venues and (after PR 6) for builder-published venues, because publish writes to the same relational tables the existing endpoint already reads.
- `POST /locations`, `PUT /locations/:id`, `DELETE /locations/:id`, `POST /locations/search`, and the other endpoints currently registered in `routes/api/locations.js` — no signature changes, no new layout-related fields added to existing request/response shapes.
- `db/locations.js` consumers — unchanged.
- `utils/locations.js:returnCreateVenueSectionsMarkup` and the legacy `.mst` template pipeline — unchanged for legacy venues. The existing template convention is canonical S3 key by location id, not a `locations` table template pointer.
- `pnpm upload` / `pnpm download` utilities in `showtix4u-venues` — unchanged.

All builder behavior lives on the new `/locations/:id/layout-draft*` and `/locations/:id/layout-versions` paths (§6.2.2). Legacy venues that never get a draft sit in the existing flow indefinitely; the legacy system lives on by default, not by opt-in flag.

The one place existing tables get written by builder code is PR 6's publish path, which materializes the draft into existing `venue_section`/`venue_row`/`venue_seat` rows. That write is gated on (a) an admin explicitly publishing a draft for a specific venue and (b) the destructive-confirmation rule (§6.2.6 rule 3). No background job, no implicit migration. A venue without a published draft is byte-for-byte the same in the DB as it was before this workstream existed.

#### 6.2.1 Core model — "JSON authoring, relational runtime"

The clean migration pattern (codex framing — adopted):

- **Builder JSON is the authoring source** for new builder-created venues.
- **Existing relational tables remain the runtime/ticketing source**: `venue_section`, `venue_row`, `venue_seat`. Ticketing and seat selection keep using these rows — the editor is what changes, not the runtime.
- **Saving a draft** persists the JSON and validates it server-side.
- **Preview** materializes sections/rows/seats *in memory* and renders the `.mst` preview from that generated structure. No relational writes.
- **Publish** computes and uploads a content-addressed `.mst` audit object first, then materializes/version-flips `venue_section`/`venue_row`/`venue_seat` runtime rows and promotes the same rendered template to the canonical S3 key the current renderer already fetches (`<location.id>.mst` under `REACT_APP_VENUE_URL`).
- **Legacy venues continue to work unchanged**: the current relational layout endpoint + canonical S3 `.mst` path serves them; `GET /locations/:id/layout` consumers do not need to understand builder JSON. Legacy venues only become builder-edited if/when a draft is explicitly seeded for them.
- **New builder venues do not require manually-created HTML files.** The publish path generates the `.mst` from the JSON-derived structure.

#### 6.2.2 Table + endpoints

- `db/migrations/2026-05/venue-layout-draft.sql`:
  - Columns: `venue_layout_draft_id` PK, `location_id` FK, `status` enum (`draft`/`published`/`archived`), `layout_json` JSON if MySQL ≥ 5.7.8 else LONGTEXT (verify at kickoff), `schema_version`, `builder_version`, `template_s3_key` (content-addressed audit key), `canonical_template_key` (current renderer key, e.g. `venues/<location.id>.mst`), `content_hash`, `created_by` / `updated_by` / `published_by`, `created_at` / `updated_at` / `published_at`.
  - Indexes: `(location_id, status)`, `(location_id, published_at)`.
  - Published versions stay queryable after newer drafts are created.
  - New table (additive). DB snapshot before the migration runs in each environment, same convention as §4.1. PR 6 publish path will write to existing `venue_section` / `venue_row` / `venue_seat` tables — snapshot also before the first real publish in each environment, since that does mutate existing seating tables.
- `db/venue-layout-draft.js`, `controllers/venue-layout-draft.js`.
- `routes/api/locations.js` extensions:
  ```
  GET    /locations/:id/layout-draft
  POST   /locations/:id/layout-draft
  PUT    /locations/:id/layout-draft/:draftId
  POST   /locations/:id/layout-draft/:draftId/preview
  POST   /locations/:id/layout-draft/:draftId/publish
  GET    /locations/:id/layout-versions
  ```

#### 6.2.3 New venue creation flow

- Keep the existing location create/update API working for legacy / manual venue workflows (no regression).
- Add a builder-aware save flow for new venues:
  1. Create or update the `locations` shell via the existing location API.
  2. Create a `venue_layout_draft` row carrying the builder `layout_json`.
  3. Server-side validate and normalize the JSON.
  4. Return generated counts + diagnostics (sections, rows, seats, tables, warnings) so the builder UI can surface validation immediately.
- The draft is editable until publish. Only publish writes ticketing-runtime rows.

#### 6.2.4 Adapters (full list)

- **Relational → builder JSON** — load existing relational layout into editable JSON (seeds builder for legacy edits).
- **Builder JSON validation** — duplicate names, empty sections, invalid seat counts, bad dimensions.
- **Builder JSON normalization** — canonical sections/rows/tables/seats (handles renames, drift, ordering).
- **Builder JSON materializer** — generates the same in-memory section/row/seat objects the current relational system expects. Used by preview and publish.
- **Builder JSON → `.mst` preview** — render via Node port of `utils/locations.js:returnCreateVenueSectionsMarkup`.
- **Builder JSON → relational publish plan** — diff against current relational state, identify ID mapping + destructive changes.
- **Publish plan → `venue_section`/`venue_row`/`venue_seat` writes** — inside a transaction.
- **Published relational layout → builder JSON** (fallback) — for future edits of builder-published venues if no recent JSON draft exists.

#### 6.2.5 Migration paths

- **Legacy venue → builder** — generate a seed draft from the current relational layout + `.mst` context. Leave the published legacy runtime untouched until the draft is explicitly published.
- **New builder venue → runtime** — save JSON draft, preview generated layout, publish to relational rows/seats + `.mst`. After publish, the venue uses the same runtime reads as legacy venues.
- **Builder-published venue → future edits** — load the latest published `venue_layout_draft.layout_json` when available; fall back to the relational → builder JSON adapter if no draft exists.
- **Legacy-only venue → no change** — current relational layout endpoint + canonical S3 `.mst` path continues to work without any builder draft. This is the default state for every existing venue. No legacy venue is migrated to builder JSON unless an admin explicitly opts it in.

#### 6.2.6 Publish rules

1. Preserve `section_id` / `row_id` / `seat_id` where names match.
2. New IDs only for genuinely new objects.
3. Destructive changes return structured error with affected tickets/events. Admin retries with `confirm_destructive: true` + **typed event name(s)** — typed value, not just a boolean — for active-event destructive publishes.
4. Publish is versioned and coordinated from the runtime's point of view: (a) compute the new `.mst` + content hash, (b) upload the new template to a content-addressed/pending S3 key **before** touching runtime rows, (c) acquire a per-location publish lock, (d) start a DB transaction and write the new relational layout rows + published draft trace, (e) promote/copy the already-uploaded template to the canonical S3 key the current renderer fetches (`${REACT_APP_VENUE_URL}${location.id}.mst`), (f) commit the DB transaction, and (g) bust Redis after commit. If S3 upload fails, no DB runtime flip happens. If canonical-key promotion fails, roll back the DB transaction. If DB commit fails after canonical-key promotion, restore the previous canonical template from S3 versioning or an explicit pre-publish backup object. **Compensation behavior documented before publish endpoint enables.**
5. Do **not** add a new `locations` schema column, template pointer, `template_format` enum, or existing location API field to gate builder-vs-legacy. Current cur8-ui fetches venue templates by S3 key convention (`REACT_APP_VENUE_URL + location.id + '.mst'`). Builder-published venues use the same convention by replacing the canonical `.mst` object; content-addressed keys live in `venue_layout_draft` for audit, support, and rollback.
6. Bust `db:venue:<id>` Redis cache after publish.
7. Record the published draft / `venue_layout_draft_id` that produced the relational layout in `venue_layout_draft` status history or an audit log, not by adding a new field to existing `locations` API responses.
8. Superseded **`venue_layout_draft`** rows go to `status = 'archived'` (the enum value defined in §6.2.2), never hard-deleted. Runtime tables `venue_section` / `venue_row` / `venue_seat` have no `status`/`archived` column (verified against `origin/staging:db/schema/base.sql`) and are not archived by this rule — publish writes update them in place under the §6.2.6 rule 4 transaction. If product later wants runtime-row history, that's a separate archive-table/versioning design and is **not** in scope for this plan.
9. Customer-facing reserved seating renderer stays unchanged until parity is proven.

**Publish endpoint ships in a later PR** (§9 PR 6) after parity proof on at least one real venue. Draft + preview ship first in PR 4.

### 6.3 Builder package extraction — `feat/venue-builder-ui`

Branch off `origin/dev`.

- Builder TS source moves from `showtix4u-venues/builder/src/` into `cur8-ui/packages/venue-builder/` (workspace dir). Vite build, output consumed by main app. No standalone repo (codex v2 — concurred).
- Builder package keeps TS source. cur8-ui app code stays plain JS (PLAN locked decision #5 preserved).
- Leave `showtix4u-venues/builder/` **in place as the reference copy** until the cur8-ui integration builds + runs in dev (codex v2 — adopted). Delete from showtix4u-venues only in a follow-up cleanup after the new package is accepted.

### 6.4 Builder feature set + UI mount

- New container `app/containers/Admin/VenueBuilder/`. Existing admin auth + routing.
- Internal `support` permission first; broaden to `admin` after alpha.
- Customer-facing seat selection continues rendering legacy `.mst`; `mustache` stays in cur8-ui.

Minimum feature set:

- Load existing venue layout (calls draft endpoint; seeds via relational → builder JSON adapter if no draft).
- **Create a new venue shell and save the first builder JSON draft** — exercises the new venue creation flow (§6.2.3).
- Autosave draft (debounced PUT).
- Undo/redo (Fabric native).
- Import/export JSON.
- Validate before save (server returns counts + diagnostics).
- Preview via the same render path as customer-facing — byte-equivalent on section names, seat IDs, section/row CSS classes, seat-type markers.
- Publish with diff summary (PR 6).
- Active-event / ticket warnings before destructive changes.

### 6.5 `showtix4u-venues` role during migration

- Short term: template archive + `pnpm upload` / `pnpm download` utility (untouched).
- Medium term: cur8-api publish flow becomes S3 source of truth.
- Long term: `showtix4u-venues/html/` retires; `builder/` extracted per §6.3.

## 7. Coordination notes

### 7.1 `feat/upgrade-2026q2` parked work

Kept on the branch, picked up by a future plan: W0 baselines, Wave-A oxlint/oxfmt, aws-sdk v2 → v3 (non-SRS), moment → dayjs, promise-mysql → mysql2, @google/maps → @googlemaps, sib-api-v3-sdk → @getbrevo/brevo, fluent-ffmpeg → spawn, randomized-string → crypto, pnpm 11.x, canvas 2 → 3, nodemon dev-deps, Node 24.15.0 pin. Branch stays long-lived. Do not merge to staging.

### 7.2 `dev-with-upgrade-2026q2` parked work

Router-7 finish, class→function, oxfmt sweep, dep pin sweep. Kept local + pushed.

### 7.3 Deferred SRS-adjacent work

- `tasks/video-processing-alt.js` + `video-processing-alt-broll.js` from `feature/streaming-service` (SRS post-stream transcoding).
- `routes/security/index.js` refactor.

Both useful, both not first-live blockers. Follow-up plan.

### 7.4 Plan convergence (canonical)

Aligned decisions:

- Fresh branches off staging/dev; do not merge upgrade branches.
- Branch names: `feat/srs` (cur8-api), `feat/srs-ui` (cur8-ui), `feat/venue-builder-api` (cur8-api), `feat/venue-builder-ui` (cur8-ui).
- SRS adapts to existing playback contract; `controllers/streaming.js` not rewritten wholesale.
- `vendor/hls.js` + `controllers/hls.js` extend, stay as compatibility boundary that delegates internally to SRS/S3 helpers — external playback URL contract unchanged.
- Initial SRS runtime is per-stream `RunTask`: every active stream gets its own SRS Fargate task. Deterministic public ingress is provided by the always-on router service, not by sharing SRS itself.
- cur8-ui keeps current `StreamVideoPlayer`; no `HlsPlayer` port; no new WebRTC viewer path.
- **WebRTC playback codepaths removed + `@antmedia/webrtc_adaptor` swapped for SRS WHIP in PR 3 (`feat/srs-ui`)**. Browser publish (`LibraryFilmReview` reviewer recording) preserved via the new WHIP path. AMS HLS playback remains as the rollback target; WebRTC was never the canonical viewer path so playback rollback is preserved.
- Provider default `'ant-media'` during rollout; flips to `'srs'` after validation; AMS code removed in a dedicated follow-up.
- Skip `add-task-arn-to-ams-streams.sql` salvage.
- aws-sdk v3 only for new SRS modules.
- Provider-neutral API fields preferred over UI branching.
- iOS Safari native HLS as a gate.
- Separate branches per workstream (SRS critical-path; venue builder independent).
- Fabric builder is source-of-truth; cur8-ui Konva demo is reference material only.
- Typed destructive-publish confirmation (not boolean).
- S3 compensation behavior documented before publish endpoint enables.
- **Venue migration: "JSON authoring, relational runtime"** — builder JSON is the authoring source for new builder-created venues; existing relational tables remain the ticketing/runtime source; legacy venues continue to work unchanged; new builder venues do not require manually-created HTML; preview materializes in memory, publish uploads a content-addressed `.mst` audit object first and then coordinates relational runtime rows + canonical S3 `<location.id>.mst` promotion; full migration paths covered (legacy seed, new-venue create, builder-published edit, legacy-only no-change).
- Publish records draft version for support traceability + promotes the generated `.mst` to the canonical S3 key the existing renderer already fetches.

Plan details retained from the source reviews:

- §3 cur8-api branch-table correction on `fix/streaming`.
- §8 explicit branch-hygiene table.
- §7.1 / §7.2 named parking-branch work lists.
- §3 / §7.3 explicit defer list for `tasks/video-processing-alt*.js` + security routes refactor.
- §11 effort estimates per branch.
- §12 open decisions / blockers.
- §13 execution log.

### 7.5 Locked PLAN.md decisions

All locked decisions stay locked. The HLS-only directive **partitions** locked decision #8 (AMS removal) into two windows:

- **PR 3 (`feat/srs-ui`)** removes the cur8-ui WebRTC playback codepaths (`LivestreamWatchPage` + `LibraryFilmReview` WebRTC playback half), replaces `LibraryFilmReview` browser publish with SRS WHIP, deletes the `AntMediaPage` demo container, and removes the `@antmedia/webrtc_adaptor` dep.
- **Post-validation AMS-removal follow-up** removes the AMS server code (`vendor/ant-media.js`, `controllers/ant-media.js`), terraform `terraform/ant-media/`, AMS support screens, the `streaming.provider` flag itself, and drops `ams_streams` after DBA sign-off + tears down AMS Fargate/EC2/NLB.

Splitting the removals like this preserves AMS HLS playback rollback through the validation window while shrinking the UI surface immediately. It does **not** preserve AMS browser-publish rollback after PR 3; WHIP/SRS is the browser-publish path from that point forward.

## 8. Branch hygiene

After `feat/srs` + `feat/srs-ui` + `feat/venue-builder-*` PRs merge:

| Repo | Branch | Action |
|---|---|---|
| cur8-api | `feature/streaming-service` | Delete (salvage taken; rest deferred per §7.3) |
| cur8-api | `fix/streaming` | Delete (no salvage) |
| cur8-api | `streaming-5443` | Delete |
| cur8-api | `dev/brady` | Archive tag `archive/dev-brady-2025-06`, then delete |
| cur8-api | `ams-vimeo-replace` | Keep until AMS removal PR, then delete |
| cur8-api | `fix/film-review-app` | Decide separately |
| cur8-api | `feat/upgrade-2026q2` | **Keep** (parking branch, §7.1) |
| cur8-ui | `feature/repo-upgrades` | Delete after `app/utils/whip-client.js` salvage lands and is audited against §4.5 / §5.3 |
| cur8-ui | `vegas.dev` | Delete |
| cur8-ui | `dev-with-upgrade-2026q2` | **Keep** (parking branch, §7.2) |

Pre-delete: grep new branches to confirm intended salvage actually landed.

## 9. PR sequence

Six PRs:

1. **`cur8-api` `feat/srs`**: SRS foundation behind `streaming.provider` flag — additive files only. Default unset → AMS app behavior unchanged. Does not wire into `retrieveAndStoreStreamInfo` yet. **Before this PR is cut, decide §12.5 (router transport shape) and §12.6 (per-task UDP addressability).** This PR includes the **per-stream Fargate task definition** (small spec; not launched yet, definition only), the **always-on router service** (Node proxy on Fargate, ~0.25–0.5 vCPU), the CDK ingress construct in `infra/lib/srs-stack.ts` (NLB with TLS + RTMP TCP listeners → router; per-task UDP addressability per the §12.6 choice), CloudFormation outputs for the public router hostname, Route53/ACM/security groups, IAM for cur8-api to `RunTask`/`StopTask`/`DescribeTasks`/`iam:PassRole`/`ec2:DescribeNetworkInterfaces`, SRS task-role IAM for `ec2:DescribeNetworkInterfaces` candidate self-resolution plus existing S3 upload permissions, and CloudWatch alarms. Security groups follow §4.5: public TCP only to the router; SRS task TCP `1935` from the router SG only; SRS task TCP `1985` from the router SG **and** the cur8-api/app SG (router forwards WHIP signaling; cur8-api runs the readiness probe + sweep); public UDP only on the chosen RTC media port/range. The router service is desired-count 1 and idle-cost from PR 1 deploy onward; per-stream tasks accrue zero idle cost (launched on demand by PR 2 code). Runtime model for all PRs: one per-stream Fargate SRS task per active stream, routed via stream_id by the router service. Infra/security/cost posture changes in this PR even though application behavior does not.
2. **`cur8-api` `feat/srs`**: SRS integration with existing HLS contract. `controllers/streaming` provider branch + `vendor/hls.js` + `controllers/hls.js` SRS path + public WHIP ingress / SRS film-review credential contract.
3. **`cur8-ui` `feat/srs-ui`**: provider-neutral streaming UI adjustments, SRS publish details, **WHIP browser-publish swap in `LibraryFilmReview` using the public `whip_url` contract (preserves reviewer-recording feature)**, WebRTC playback removal, `@antmedia/webrtc_adaptor` package removal, iOS Safari validation.
4. **`cur8-api` `feat/venue-builder-api`**: venue layout draft + preview endpoints + table migration + new builder-backed venue save flow (§6.2.3) + JSON-to-runtime materialization plan (§6.2.4 adapters). No publish endpoint yet.
5. **`cur8-ui` `feat/venue-builder-ui`**: Fabric builder extracted to `packages/venue-builder/`, mounted at `containers/Admin/VenueBuilder/`. Draft + preview only.
6. **`cur8-api` + `cur8-ui`** coordinated: venue publish flow after parity proof on at least one real venue. May need a small `feat/venue-builder-publish` branch in each repo.

SRS PRs (1–3) and venue-builder PRs (4–6) are independent. PR 4 can start immediately and can land in parallel with SRS soak.

## 10. Release sequence

1. PR 1 lands. Deploy cur8-api to staging with `streaming.provider` unset → no app behavior change; router service + per-stream task definition + WHIP/RTMP ingress infrastructure exist but no traffic flows yet and no per-stream tasks are running. Idle cost is just the always-on router (~$22/mo at 0.25 vCPU Fargate). Per-stream tasks accrue zero cost until PR 2 starts launching them.
2. PR 2 lands. Deploy to dev. Flip `streaming.provider = srs` in dev. Run §4.9 gates, including public HTTPS WHIP ingress and browser media connectivity.
3. PR 3 lands. Deploy cur8-ui to dev. AMS HLS path remains the playback rollback target. AMS WebRTC playback paths and `@antmedia/webrtc_adaptor` are **gone** at this point, and browser publish is SRS WHIP only.
4. SRS dev validation green → flip staging. Multi-day soak.
5. Staging green → flip prod. 48-hour monitoring window.
6. Prod clean → flip default of `streaming.provider` to `'srs'` in config (rollback to AMS HLS still available as long as AMS code is in tree).
7. PR 4 + PR 5 land in parallel with SRS soak when not blocked.
8. **AMS-removal follow-up PRs** (`chore/ams-removal` per repo): delete `vendor/ant-media.js`, `controllers/ant-media.js`, `terraform/ant-media/`, AMS support screens, the `streaming.provider` flag itself. Drop `ams_streams` after DBA sign-off. Tear down AMS Fargate / EC2 / NLB. (WebRTC adaptor + WebRTC playback codepaths already gone via PR 3.)
9. PR 6 lands after venue parity on at least one real venue.

## 11. Estimated effort

- `feat/srs` (cur8-api): **8–11 days**. Foundation port mechanical (1–2 d). Router service implementation + Redis state machine (3–5 d, long pole per PLAN.md §W1 #3 estimate of ~1 week). `vendor/hls.js` + `controllers/hls.js` extension + `retrieveAndStoreStreamInfo` provider branch (1–2 d). Public WHIP ingress + per-task UDP addressability wiring + SRS film-review credential contract + readiness probe + immediate-StopTask cleanup + stale-launch sweep (1.5–2 d, expanded for v19 lifecycle hardening). Tests + smoke (1.5 d, expanded for v19 resolver/sweep/router-translation/callback-identity gates).
- `feat/srs-ui` (cur8-ui): 3–5 days. Admin-side display + WHIP client port/audit + film-review publish swap + WebRTC playback removal + `@antmedia/webrtc_adaptor` removal + browser publish manual validation + iOS verification.
- `feat/venue-builder-api` (cur8-api): 4–6 days. Draft + preview endpoints + table migration + new-venue save flow + adapter set (relational↔JSON, normalization, materializer, preview render, publish-plan diff). No publish endpoint enabled.
- `feat/venue-builder-ui` (cur8-ui): 1–2 weeks. Package extraction + Vite build wiring + admin mount + minimum feature surface incl. new venue create-and-save-first-draft.
- PR 6 (publish): 1–2 weeks. Publish-plan diff + destructive confirmation + transaction/S3 compensation + canonical `.mst` promotion + draft-version traceability record.
- AMS-removal follow-up (post-validation, separate plan): a few days code, plus AWS infra teardown.

## 12. Open decisions / blockers

1. **Konva demo disposition** — leave as inert demo in cur8-ui or remove. Default: leave for a later cleanup, not this plan.
2. **Plan commit posture** — `converged-plan.md` is canonical and the only remaining plan file. Decide whether to commit it directly on `main` (solo-repo carve-out).
3. **Stale-branch deletes** (`dev/brady`, `vegas.dev`) — now or after merge. Default after merge (§8).
4. **MySQL JSON vs LONGTEXT** for `venue_layout_draft.layout_json` — verify prod DB version at `feat/venue-builder-api` kickoff.
5. **Router service transport shape** — choose and document TLS ownership before PR 1 (see §4.5). Default: single NLB with TLS termination for HTTPS WHIP signaling, forwarding plaintext HTTP to the router, plus TCP passthrough for RTMP on 1935, both targeting the router. Alternative: router terminates TLS in-app, but then router cert loading, listener config, and tests must land in the same PR. UDP RTC media bypasses the LB entirely (browser → per-task public IP direct).
6. **Per-task UDP addressability** — choose EIP per task vs awsvpc `assignPublicIp: ENABLED` vs shared NLB UDP target groups (see §4.5). Default for first-live: awsvpc public-IP-on-task. Decision drives SRS `rtc_server.candidate` config and per-stream task launch latency.
7. **WHIP iOS/Firefox compatibility** — confirm reviewer hardware mix during PR 3 manual validation; if WHIP fails on a required browser, escalate (potential fallback: stay on RTMP-via-OBS for that workflow). Initial expectation: modern WHIP support is universal.

