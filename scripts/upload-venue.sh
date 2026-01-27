#!/usr/bin/env bash
set -euo pipefail

BUCKET="prdv2-dt-client"
PREFIX="venues"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  echo "Upload venue HTML files to S3 as .mst files"
  echo ""
  echo "Usage: $0 <id> [id2 ...]"
  echo "       $0 --all"
  echo ""
  echo "Examples:"
  echo "  $0 66517"
  echo "  $0 1915 2656"
  echo "  $0 --all    # uploads all html/*.html files"
}

upload_file() {
  local html_file="$1"
  local basename
  basename="$(basename "$html_file" .html)"
  local s3_key="s3://${BUCKET}/${PREFIX}/${basename}.mst"

  echo "Uploading ${html_file} -> ${s3_key}"
  AWS_PROFILE=cur8-prod op plugin run -- aws s3 cp "$html_file" "$s3_key" \
    --content-type "text/html"
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

resolve_file() {
  local id="$1"
  local file="${REPO_ROOT}/html/${id}.html"
  if [[ ! -f "$file" ]]; then
    echo "Error: html/${id}.html not found" >&2
    exit 1
  fi
  echo "$file"
}

if [[ "$1" == "--all" ]]; then
  for f in "$REPO_ROOT"/html/*.html; do
    upload_file "$f"
  done
else
  for id in "$@"; do
    upload_file "$(resolve_file "$id")"
  done
fi

echo "Done."
