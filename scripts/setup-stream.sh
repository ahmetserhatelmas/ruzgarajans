#!/usr/bin/env bash
# Cloudflare Stream → Supabase Edge Function bağlama
set -euo pipefail
cd "$(dirname "$0")/.."

ACCOUNT_ID="41b955216a32ee490e0610f19d0fd5e4"
TOKEN="${1:-}"
PROJECT_REF="afrrhkemaiwkdyfgfwif"

if [[ -z "$TOKEN" ]]; then
  echo "Kullanım: ./scripts/setup-stream.sh cfat_XXXX"
  exit 1
fi

echo "→ Secrets"
supabase secrets set \
  "CLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}" \
  "CLOUDFLARE_STREAM_API_TOKEN=${TOKEN}" \
  --project-ref "$PROJECT_REF"

echo "→ Deploy cf-stream-upload"
supabase functions deploy cf-stream-upload --project-ref "$PROJECT_REF"

echo "✓ Hazır. Uygulamadan Tanıtım Ver / Oyun Ver dene."
