# ShowTix4U Venues

HTML venue maps uploaded to S3 as `.mst` files. ~3,000 venues. Data/HTML repo, not a JS/TS project.

## Tooling

- **pnpm** via corepack — Biome for formatting and linting
- `pnpm format` / `pnpm format:check` / `pnpm lint` / `pnpm check`
- Biome's HTML formatter breaks `{{{ }}}` into `{{ {` — the `format` and `check` scripts auto-fix this with sed
- `pnpm upload` / `pnpm download` — accepts venue IDs, file paths, `--all`, `--dry-run`, `--concurrency N`, `--file PATH`
- S3 auth: `AWS_PROFILE=cur8-prod` via 1Password (`op plugin run -- aws`)

## HTML Template Syntax

Venues use Handlebars-style placeholders rendered by the app:

- `{{{ sectionNames.<ID> }}}` — section header
- `{{{ sectionsMarkup.<ID> }}}` — seat map table for that section
- Seating images hosted at `https://s3.amazonaws.com/prdv2-dt-client/seating_images/`

## Venue HTML Guidelines

- Refer to venues by their numeric ID
- Prefer stage spacer height of `25px` unless a spec says otherwise
- "One large section" layouts: stack `sectionsMarkup.*` vertically in a single centered inner table, use main section's name as the single header
- Use lightweight row-color wrappers (`.row-premium td:has(.seatCharts-seat) { ... }`) to separate premium rows

## Reference Files

- `utils/ReservedSeating.scss` — seat styling reference (used by the app frontend, not by these HTML files directly)
