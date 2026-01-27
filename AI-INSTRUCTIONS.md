# ShowTix4U Venues - AI Instructions

## Behavior

- **Be Concise**: Minimize conversational filler. Provide code or answers directly.
- **Optimize Tokens**: Avoid repeating large blocks of unchanged code.
- **Context Awareness**: Project involves HTML parsing and data collection.

## Project Structure

- `html/`: Venue HTML files (`<id>.html`). Uploaded to S3 as `.mst` files.
- `screenshots/`: Screenshot images
- `specs/`: Venue specification images
- `utils/`: Data-processing assets (`ReservedSeating.scss`)
- `scripts/`: CLI scripts (`upload-venue.sh`)

## Tooling

- **Package Manager**: pnpm (via corepack, pinned in `package.json`)
- **Formatter**: Prettier — config in `prettier.config.js`, matches rxco shared standards
- **No linter** — this is a data/HTML repo, not a JS/TS project

### Scripts

- `pnpm format` — format all files with Prettier
- `pnpm format:check` — check formatting without writing
- `pnpm upload` — alias for `scripts/upload-venue.sh`

## S3 Upload

Venues are uploaded to `s3://prdv2-dt-client/venues/` as `.mst` files using `AWS_PROFILE=cur8-prod`.

```sh
# Single file
./scripts/upload-venue.sh html/1915.html

# Multiple files
./scripts/upload-venue.sh html/1915.html html/2656.html

# All venues
./scripts/upload-venue.sh --all
```

## Guidelines

- When analyzing HTML files, refer to them by their ID
- Utility scripts in `utils/` should be preferred for data manipulation
- Follow existing patterns in `utils/`
- Prefer the common stage spacer pixel height of `25` unless a spec suggests otherwise
- For "one large section" layouts made from multiple section IDs, stack `sectionsMarkup.*` vertically inside a single centered inner table
- In stacked layouts, use the main section's name (`sectionNames.<mainId>`) as the single header
- Use lightweight row-color wrappers (e.g., `.row-premium td:has(.seatCharts-seat) { ... }`) to visually separate premium rows while preserving a single-section look
