#!/usr/bin/env bash
set -euo pipefail

BUCKET="prdv2-dt-client"
PREFIX="venues"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  echo "Upload venue HTML files to S3 as .mst files"
  echo ""
  echo "Usage: $0 [options] <id|html_path> [id2|html_path2 ...]"
  echo ""
  echo "Options:"
  echo "  -j, --concurrency N   Parallel uploads (default: 4)"
  echo "  --file PATH           Read IDs from a file (one per line, # comments ok)"
  echo "  --dry-run             Print actions without uploading"
  echo "  -h, --help            Show help"
  echo ""
  echo "Examples:"
  echo "  $0 66517"
  echo "  $0 1915 2656"
  echo "  $0 html/1915.html html/2656.html"
}

aws_cmd() {
  AWS_PROFILE=cur8-prod aws "$@"
}

maybe_run() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

preflight_auth() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    return 0
  fi
  if ! aws_cmd sts get-caller-identity >/dev/null 2>&1; then
    echo "Error: AWS auth failed. Verify 1Password CLI auth and the cur8-prod AWS profile." >&2
    exit 1
  fi
}

upload_file() {
  local html_file="$1"
  local basename
  basename="$(basename "$html_file" .html)"
  local s3_key="s3://${BUCKET}/${PREFIX}/${basename}.mst"

  echo "Uploading ${html_file} -> ${s3_key}"
  maybe_run aws_cmd s3 cp "$html_file" "$s3_key" \
    --content-type "text/html"
}

resolve_file() {
  local input="$1"
  local file=""

  if [[ "$input" == *.html ]] || [[ "$input" == */* ]]; then
    file="$input"
  else
    file="${REPO_ROOT}/html/${input}.html"
  fi

  if [[ ! -f "$file" ]]; then
    echo "Error: ${file} not found" >&2
    exit 1
  fi
  echo "$file"
}

CONCURRENCY=4
DRY_RUN=0
IDS_FILE=""
ARGS=()

read_ids_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Error: ${file} not found" >&2
    exit 1
  fi
  while IFS= read -r line; do
    line="${line%%#*}"
    line="${line%%$'\r'}"
    if [[ -n "$line" ]]; then
      ARGS+=("$line")
    fi
  done < "$file"
}

init_semaphore() {
  local max="$1"
  local sem
  sem="$(mktemp -u)"
  mkfifo "$sem"
  exec 9<>"$sem"
  rm -f "$sem"
  local i
  for ((i=0; i<max; i++)); do
    printf '.' >&9
  done
}

run_with_semaphore() {
  read -r -u 9 -n 1
  {
    "$@"
    printf '.' >&9
  } &
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -j|--concurrency)
      CONCURRENCY="${2:-}"
      shift 2
      ;;
    --file)
      IDS_FILE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$IDS_FILE" ]]; then
  read_ids_file "$IDS_FILE"
fi

if [[ ${#ARGS[@]} -eq 0 ]]; then
  usage
  exit 1
fi

preflight_auth

if [[ "$CONCURRENCY" -le 1 ]]; then
  for input in "${ARGS[@]}"; do
    upload_file "$(resolve_file "$input")"
  done
else
  init_semaphore "$CONCURRENCY"
  for input in "${ARGS[@]}"; do
    run_with_semaphore upload_file "$(resolve_file "$input")"
  done
  wait
fi

echo "Done."
