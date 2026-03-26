# ShowTix4U Venues

HTML venue seat maps for the ShowTix4U ticketing platform. Each file defines the layout for a single venue and is uploaded to S3 as a `.mst` (Mustache) template, rendered at runtime by the app.

The repo currently contains **~3,000 venue maps** in `html/`.

## Prerequisites

- **Node.js** (LTS recommended)
- **pnpm** via [Corepack](https://nodejs.org/api/corepack.html) — run `corepack enable` if not already active
- **AWS CLI** with [1Password CLI plugin](https://developer.1password.com/docs/cli/) for S3 access (`AWS_PROFILE=cur8-prod`)

## Setup

```sh
corepack enable   # activates pnpm
pnpm install      # installs Prettier
```

## Project Structure

```
html/           # Venue HTML files named by numeric venue ID (e.g. 1915.html)
scripts/
  upload-venue.sh    # Upload HTML files to S3 as .mst
  download-venue.sh  # Download .mst files from S3 as HTML
utils/
  ReservedSeating.scss  # Seat styling reference (used by the app frontend)
screenshots/    # Venue screenshots for reference
```

## Scripts

### Formatting

```sh
pnpm format          # Format all files with Prettier
pnpm format:check    # Check formatting without writing
```

### Upload & Download

Both scripts authenticate via 1Password (`op plugin run -- aws`). Unlock 1Password before running.

```sh
# Upload by venue ID
pnpm upload 1915
pnpm upload 1915 2656

# Upload by file path
pnpm upload html/1915.html

# Download by venue ID
pnpm download 1915
pnpm download 1915 2656

# Read IDs from a file (one per line, # comments supported)
pnpm upload --file ids.txt
pnpm download --file ids.txt

# Parallel operations (default concurrency: 4)
pnpm upload -j 8 --file ids.txt

# Preview without making changes
pnpm upload --dry-run 1915
pnpm download --dry-run 1915
```

## HTML Template Syntax

Venue files use Handlebars-style placeholders that the app renders at runtime:

| Placeholder                   | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `{{{ sectionNames.<ID> }}}`   | Section header (e.g. "Orchestra", "Balcony") |
| `{{{ sectionsMarkup.<ID> }}}` | Seat map table for a section                 |

Seating images are hosted at `https://s3.amazonaws.com/prdv2-dt-client/seating_images/`.

## Conventions

- **File naming** — Each venue file is named by its numeric ID: `html/<venueId>.html`
- **Stage spacer** — Use a height of `25px` unless a spec says otherwise
- **Single-section layouts** — Stack `sectionsMarkup.*` entries vertically inside a single centered inner table; use the main section's name as the single header
- **Premium row styling** — Use lightweight CSS wrappers: `.row-premium td:has(.seatCharts-seat) { ... }`
