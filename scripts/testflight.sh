#!/usr/bin/env bash
# TestFlight: build + submit (interactive Apple login required once)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ iOS production build (Apple hesabına giriş sorabilir)"
npx eas-cli build --platform ios --profile production --auto-submit

echo "✓ Bitti. TestFlight durumu: https://appstoreconnect.apple.com"
