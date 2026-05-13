#!/usr/bin/env python3
"""Normalize inline CSS declarations in style attributes."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


STYLE_ATTR_RE = re.compile(
    r"(?P<prefix>\bstyle\s*=\s*)(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
    re.IGNORECASE | re.DOTALL,
)


def split_css_list(value: str, separator: str) -> list[str]:
    """Split CSS text on a separator, ignoring separators in quotes/parens."""
    parts: list[str] = []
    current: list[str] = []
    quote: str | None = None
    escaped = False
    paren_depth = 0

    for char in value:
        if escaped:
            current.append(char)
            escaped = False
            continue

        if quote:
            current.append(char)
            if char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue

        if char in {"'", '"'}:
            quote = char
            current.append(char)
            continue

        if char == "(":
            paren_depth += 1
        elif char == ")" and paren_depth:
            paren_depth -= 1

        if char == separator and paren_depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(char)

    parts.append("".join(current))
    return parts


def split_declaration(declaration: str) -> tuple[str, str] | None:
    parts = split_css_list(declaration, ":")
    if len(parts) < 2:
        return None
    return parts[0], ":".join(parts[1:])


def normalize_style_value(value: str) -> str:
    declarations: list[str] = []

    for raw_declaration in split_css_list(value, ";"):
        declaration = raw_declaration.strip()
        if not declaration:
            continue

        split = split_declaration(declaration)
        if split is None:
            declarations.append(declaration)
            continue

        property_name, property_value = split
        declarations.append(f"{property_name.strip()}: {property_value.strip()}")

    if not declarations:
        return ""

    return "; ".join(declarations) + ";"


def normalize_text(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        quote = match.group("quote")
        value = match.group("value")
        return f"{prefix}{quote}{normalize_style_value(value)}{quote}"

    return STYLE_ATTR_RE.sub(replace, text)


def iter_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []

    for path in paths:
        if path.is_dir():
            files.extend(sorted(candidate for candidate in path.rglob("*.html") if candidate.is_file()))
        elif path.is_file():
            files.append(path)
        else:
            raise FileNotFoundError(path)

    return files


def process_file(path: Path, check: bool) -> bool:
    original = path.read_text()
    normalized = normalize_text(original)

    if normalized == original:
        return False

    if check:
        print(f"Inline styles need normalization: {path}")
    else:
        path.write_text(normalized)

    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize inline style attributes in HTML files.")
    parser.add_argument("paths", nargs="+", type=Path, help="HTML files or directories to process.")
    parser.add_argument("--check", action="store_true", help="Report files that would change without writing.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        changed = [path for path in iter_files(args.paths) if process_file(path, args.check)]
    except OSError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    if args.check and changed:
        return 1

    if changed and not args.check:
        print(f"Normalized inline styles in {len(changed)} file(s).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
