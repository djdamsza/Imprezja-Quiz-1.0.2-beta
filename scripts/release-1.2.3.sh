#!/usr/bin/env bash
# Publikacja Imprezja Quiz v1.2.3 na GitHub Release.
#
# Użycie:
#   1. Upewnij się, że `npm run pac` zakończył się sukcesem i w dist/ są 3 pliki:
#        - Imprezja Quiz Setup 1.2.3.exe
#        - Imprezja Quiz-1.2.3-arm64.dmg
#        - Imprezja Quiz-1.2.3.dmg
#   2. Wklej token GitHub (classic: zakres "repo"; fine-grained: "Contents: Read and write"):
#        export GITHUB_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXXXXXX
#   3. Odpal ten skrypt:
#        bash scripts/release-1.2.3.sh
#
# Co robi (kolejno):
#   - waliduje obecność pliku .exe i obu .dmg,
#   - upload instalatorów + latest.yml/latest-mac.yml do release vX.Y.Z (scripts/publish-release.js),
#   - aktualizuje opis release treścią z CHANGELOG.md (scripts/update-release-changelog.js),
#   - weryfikuje assets (scripts/verify-github-release-assets.js).

set -euo pipefail

VERSION="1.2.3"
cd "$(dirname "$0")/.."

if [ -z "${GITHUB_TOKEN:-${GH_TOKEN:-}}" ]; then
  echo "❌ Ustaw GITHUB_TOKEN lub GH_TOKEN, np.:"
  echo "   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  exit 1
fi

PKG_VERSION="$(node -p "require('./package.json').version")"
if [ "$PKG_VERSION" != "$VERSION" ]; then
  echo "❌ package.json ma wersję $PKG_VERSION, a ten skrypt publikuje $VERSION."
  echo "   Zaktualizuj package.json albo dopasuj VERSION w tym skrypcie."
  exit 1
fi

REQUIRED_FILES=(
  "dist/Imprezja Quiz Setup ${VERSION}.exe"
  "dist/Imprezja Quiz-${VERSION}-arm64.dmg"
  "dist/Imprezja Quiz-${VERSION}.dmg"
)
MISSING=0
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "⚠️ Brak: $f"
    MISSING=1
  fi
done
if [ "$MISSING" -ne 0 ]; then
  echo "❌ Brakuje instalatorów w dist/. Uruchom najpierw: npm run pac"
  echo "   (jeśli chcesz wgrać tylko część – ustaw ALLOW_PARTIAL_PUBLISH=1 i odpal ponownie)."
  exit 1
fi

echo "🚀 Publikuję Imprezja Quiz v${VERSION} na GitHub..."
echo ""

echo "── Krok 1/3: upload instalatorów do release v${VERSION}"
npm run publish:github

echo ""
echo "── Krok 2/3: aktualizuję opis release treścią z CHANGELOG.md"
npm run release:changelog

echo ""
echo "── Krok 3/3: weryfikacja assets na GitHubie"
if npm run verify:github-release 2>/dev/null; then
  echo "✅ Release v${VERSION} gotowy i zweryfikowany."
else
  echo "⚠️ Verify zgłosił uwagi – sprawdź wyjście powyżej."
fi

echo ""
echo "✅ Gotowe. Pamiętaj o commicie + tagu w git (osobno):"
echo "   git tag v${VERSION}"
echo "   git push origin v${VERSION}"
