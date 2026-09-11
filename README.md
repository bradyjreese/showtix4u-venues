# ShowTix4U Venues

HTML venue seat maps for the ShowTix4U ticketing platform. Each file defines the layout for a single venue and is
uploaded to S3 as a `.mst` template, rendered at runtime by the app.

The repo contains approximately 3,000 venue maps in `html/`.
The browser-based venue builder is maintained separately in [venue-builder](https://github.com/bradyjreese/venue-builder).

## Requirements

Editing the templates requires only a text editor. There is no build step or package installation for venue uploads
and downloads. The transfer scripts require Bash and the AWS CLI with the `cur8-prod` profile configured through
the 1Password-backed `credential_process`.

Node.js and npm are optional; they are used only for Prettier formatting. `.node-version` records the existing Node
version for use with `fnm`.

## Project Structure

```text
html/                     # Venue templates named by numeric ID (e.g. 1915.html)
scripts/
  upload-venue.sh          # Upload HTML files to S3 as .mst
  download-venue.sh        # Download .mst files from S3 as HTML
utils/
  ReservedSeating.scss     # Seat styling reference used by the app frontend
screenshots/              # Venue screenshots for reference
```

## Edit a Venue

Open a venue in your editor, for example:

```sh
nvim html/1915.html
```

`.editorconfig` sets two-space indentation, UTF-8, LF line endings, and a final newline in supporting editors.
Neovim reads these settings without a custom configuration. The existing VS Code settings remain available.
In Neovim, `:Tutor` opens the built-in tutorial, `:write` saves, and `:quit` exits.

These files contain template placeholders. Opening one directly in a browser does not render the generated seat
tables; the app supplies those at runtime. Review the diff before uploading:

```sh
git diff -- html/1915.html
./scripts/upload-venue.sh --dry-run 1915
```

## Upload and Download

Run the scripts directly from this repository. Both use `AWS_PROFILE=cur8-prod aws ...`; the profile reads credentials
through the configured 1Password credential process.

```sh
# Upload by venue ID
./scripts/upload-venue.sh 1915
./scripts/upload-venue.sh 1915 2656

# Upload by file path
./scripts/upload-venue.sh html/1915.html

# Download by venue ID (replaces the local file)
./scripts/download-venue.sh 1915
./scripts/download-venue.sh 1915 2656

# Read IDs from a file (one per line, # comments supported)
./scripts/upload-venue.sh --file ids.txt
./scripts/download-venue.sh --file ids.txt

# Parallel operations (default concurrency: 4)
./scripts/upload-venue.sh -j 8 --file ids.txt

# Preview without making changes or contacting AWS
./scripts/upload-venue.sh --dry-run 1915
./scripts/download-venue.sh --dry-run 1915
```

For example, uploading `1915` copies `html/1915.html` unchanged to
`s3://prdv2-dt-client/venues/1915.mst` with content type `text/html`.
The `.mst` extension identifies the template; the script does not compile or render it.

## Optional Formatting

Install the locked formatter version with npm:

```sh
fnm install
fnm use
npm ci

# Format only the file you edited
npm exec -- prettier --write html/1915.html

# Check repository formatting
npm run check
```

`npm run format` formats the whole repository. Prefer formatting individual files for venue changes to keep diffs
focused. The existing Prettier rules are unchanged.

## HTML Template Syntax

Venue files use Handlebars-style placeholders that the app renders at runtime:

| Placeholder                   | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `{{{ sectionNames.<ID> }}}`   | Section header (e.g. "Orchestra", "Balcony") |
| `{{{ sectionsMarkup.<ID> }}}` | Seat map table for a section                 |

Seating images are hosted at `https://s3.amazonaws.com/prdv2-dt-client/seating_images/`.

## Conventions

- **File naming** — Each venue file is named by its numeric ID: `html/<venueId>.html`.
- **Stage spacer** — Use a height of `25px` unless a spec says otherwise.
- **Single-section layouts** — Stack `sectionsMarkup.*` entries vertically inside a single centered inner table;
  use the main section's name as the single header.
- **Premium row styling** — Use lightweight CSS wrappers: `.row-premium td:has(.seatCharts-seat) { ... }`.
- **Agent instructions** — Edit `AI-INSTRUCTIONS.md`; the agent-specific entry points are relative symlinks to it.
