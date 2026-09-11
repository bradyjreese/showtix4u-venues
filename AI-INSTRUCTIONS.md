# ShowTix4U Venues Instructions

HTML venue maps uploaded to S3 as `.mst` templates and rendered by the app.
This repository contains venue templates and transfer scripts. The browser-based
builder lives in [venue-builder](https://github.com/bradyjreese/venue-builder).

## Git Workflow

- Commit and push directly to `main`; do not create branches or pull requests for this repository.

## Tooling

- Editing and transferring venues require no Node packages or build step.
- Run `./scripts/upload-venue.sh` and `./scripts/download-venue.sh` directly.
  Both accept venue IDs, `--dry-run`, `--concurrency N`, and `--file PATH`.
  Upload also accepts HTML file paths. Neither script supports `--all`.
- S3 auth uses `AWS_PROFILE=cur8-prod aws ...` with the configured 1Password-backed `credential_process`.
- npm installs only the optional Prettier formatter. Use `npm ci`, then `npm run check` to check formatting.
- Prefer formatting the edited files with `npm exec -- prettier --write <paths>`; avoid unrelated venue reformatting.
- `.editorconfig` defines portable indentation and line endings; `.prettierrc.json` retains the formatting rules.

## Venue Templates

- Refer to venues by numeric ID: `html/<venueId>.html`.
- Preserve `{{{ sectionNames.<ID> }}}` and `{{{ sectionsMarkup.<ID> }}}` placeholders.
  The app replaces these with section headers and seat tables at runtime.
- Seating images are hosted at `https://s3.amazonaws.com/prdv2-dt-client/seating_images/`.
- Prefer a stage spacer height of `25px` unless a spec says otherwise.
- For single-section layouts, stack `sectionsMarkup.*` entries vertically inside one centered inner table;
  use the main section's name as the single header.
- Use lightweight CSS wrappers such as `.row-premium td:has(.seatCharts-seat) { ... }` for premium rows.
- `utils/ReservedSeating.scss` is an app frontend styling reference; these HTML files do not import it.

## Instruction Entry Points

Edit this file for repository instructions. `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`
are relative symlinks to it.
