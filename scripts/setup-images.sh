#!/usr/bin/env bash
# Cloudflare Images → Supabase Edge Function bağlama
# Token'da Account Images:Edit (veya Images Write) izni olmalı.
set -euo pipefail
cd "$(dirname "$0")/.."

ACCOUNT_ID="41b955216a32ee490e0610f19d0fd5e4"
TOKEN="${1:-}"
HASH="${2:-}"
PROJECT_REF="afrrhkemaiwkdyfgfwif"

if [[ -z "$TOKEN" ]]; then
  echo "Kullanım: ./scripts/setup-images.sh cfat_XXXX [ACCOUNT_HASH]"
  echo "Account hash: Cloudflare → Images → Developer Resources / imagedelivery.net URL"
  exit 1
fi

echo "→ Secrets"
ARGS=(
  "CLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}"
  "CLOUDFLARE_IMAGES_API_TOKEN=${TOKEN}"
)
supabase secrets set "${ARGS[@]}" --project-ref "$PROJECT_REF"

echo "→ Deploy cf-images-upload"
supabase functions deploy cf-images-upload --project-ref "$PROJECT_REF"

if [[ -n "$HASH" ]]; then
  echo "→ .env için: EXPO_PUBLIC_CF_IMAGES_HASH=${HASH}"
  if grep -q '^EXPO_PUBLIC_CF_IMAGES_HASH=' .env 2>/dev/null; then
    sed -i.bak "s|^EXPO_PUBLIC_CF_IMAGES_HASH=.*|EXPO_PUBLIC_CF_IMAGES_HASH=${HASH}|" .env
  else
    echo "EXPO_PUBLIC_CF_IMAGES_HASH=${HASH}" >> .env
  fi
fi

echo "✓ Hazır. Profil / galeri foto yüklemeyi dene."
