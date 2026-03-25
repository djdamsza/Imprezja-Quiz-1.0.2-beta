#!/usr/bin/env bash
# Dołącz lokalne binaria do istniejącego release na GitHubie (wymaga: gh auth login).
# Użycie:
#   ./scripts/upload-to-github-release.sh v1.0.0 releases/NJR-konwerter-1.0.0-*.exe releases/NJR-konwerter-1.0.0-macos-*
set -euo pipefail

TAG="${1:?Podaj tag, np. v1.0.0}"
shift
[ $# -gt 0 ] || { echo "Podaj co najmniej jeden plik do uploadu." >&2; exit 1; }

if ! command -v gh >/dev/null 2>&1; then
  echo "Zainstaluj GitHub CLI: https://cli.github.com/ (np. brew install gh)" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)" || true
if [ -z "${REPO:-}" ]; then
  echo "Uruchom w katalogu sklonowanego repo lub ustaw GH_REPO=owner/nazwa" >&2
  exit 1
fi

echo "Repo: $REPO — tag: $TAG — pliki: $*"
gh release upload "$TAG" "$@" --clobber --repo "$REPO"
echo "Gotowe. Release: https://github.com/$REPO/releases/tag/$TAG"
