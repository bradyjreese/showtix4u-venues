# ShowTix4U Venues Instructions

HTML venue maps uploaded to S3 as `.mst` templates and rendered by the app.
This repository contains venue templates and transfer scripts. The browser-based
builder lives in [venue-builder](https://github.com/bradyjreese/venue-builder).

## Git Workflow

- Commit and push directly to `main`; do not create branches or pull requests for this repository.

## Tooling

- This repository has no project package dependencies or build step.
- Run `./scripts/upload-venue.sh` and `./scripts/download-venue.sh` directly.
  Both accept venue IDs, `--dry-run`, `--concurrency N`, and `--file PATH`.
  Upload also accepts HTML file paths. Neither script supports `--all`.
- S3 auth uses `AWS_PROFILE=cur8-prod aws ...` with the configured 1Password-backed `credential_process`.
- `.editorconfig` defines portable indentation and line endings.
- Preserve the surrounding HTML formatting and avoid unrelated venue reformatting.
  Run `git diff --check` to check for whitespace errors before committing.

## Venue Templates

- Refer to venues by numeric ID: `html/<venueId>.html`.
- Preserve `{{{ sectionNames.<ID> }}}` and `{{{ sectionsMarkup.<ID> }}}` placeholders.
  The app replaces these with section headers and seat tables at runtime.
- Seating images are hosted at `https://s3.amazonaws.com/prdv2-dt-client/seating_images/`.
- Prefer a stage spacer height of `25px` unless a spec says otherwise.
- For single-section layouts, stack `sectionsMarkup.*` entries vertically inside one centered inner table;
  use the main section's name as the single header.
- Use lightweight CSS wrappers such as `.row-premium td:has(.seatCharts-seat) { ... }` for premium rows.

## Instruction Entry Points

Edit this file for repository instructions. `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`
are relative symlinks to it.
