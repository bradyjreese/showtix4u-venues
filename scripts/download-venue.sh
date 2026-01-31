#!/usr/bin/env bash
set -euo pipefail

BUCKET="prdv2-dt-client"
PREFIX="venues"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  echo "Download venue .mst files from S3 as .html files"
  echo ""
  echo "Usage: $0 [options] <id> [id2 ...]"
  echo ""
  echo "Options:"
  echo "  -j, --concurrency N   Parallel downloads (default: 4)"
  echo "  --file PATH           Read IDs from a file (one per line, # comments ok)"
  echo "  --dry-run             Print actions without downloading"
  echo "  -h, --help            Show help"
  echo ""
  echo "Examples:"
  echo "  $0 66517"
  echo "  $0 1915 2656"
}

aws_cmd() {
  AWS_PROFILE=cur8-prod op plugin run -- aws "$@"
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
    echo "Error: AWS auth failed. Unlock 1Password or re-auth and try again." >&2
    exit 1
  fi
}

download_file() {
  local id="$1"
  local s3_key="s3://${BUCKET}/${PREFIX}/${id}.mst"
  local html_file="${REPO_ROOT}/html/${id}.html"

  echo "Downloading ${s3_key} -> ${html_file}"
  maybe_run aws_cmd s3 cp "$s3_key" "$html_file"
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
  for id in "${ARGS[@]}"; do
    download_file "$id"
  done
else
  init_semaphore "$CONCURRENCY"
  for id in "${ARGS[@]}"; do
    run_with_semaphore download_file "$id"
  done
  wait
fi

echo "Done."
