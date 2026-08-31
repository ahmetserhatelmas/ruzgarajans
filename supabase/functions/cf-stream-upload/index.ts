// Supabase Edge Function — Cloudflare Stream direct upload URL
// Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN
/// <reference path="../deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const token = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    if (!accountId || !token) {
      return new Response(JSON.stringify({ error: 'Cloudflare not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const meta = body?.meta ?? {};
    const watermarkUid = await getOrCreateLogoWatermark(accountId, token);

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 300,
          requireSignedURLs: false,
          ...(watermarkUid ? { watermark: { uid: watermarkUid } } : {}),
          meta: {
            ...meta,
            uploadedBy: userData.user.id,
          },
        }),
      }
    );

    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson?.success) {
      return new Response(JSON.stringify({ error: cfJson?.errors ?? 'CF error' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        uploadURL: cfJson.result.uploadURL,
        uid: cfJson.result.uid,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});

const WATERMARK_NAME = 'ruzgar-logo-lower-right';

type CfWatermark = { uid?: string; name?: string };

async function getOrCreateLogoWatermark(accountId: string, token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  try {
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/watermarks`,
      { headers: auth }
    );
    const listJson = await listRes.json();
    const existing = (listJson?.result as CfWatermark[] | undefined)?.find(
      (item) => item.name === WATERMARK_NAME && item.uid
    );
    if (existing?.uid) return existing.uid;

    const logoUrl =
      Deno.env.get('BRAND_LOGO_URL') ||
      'https://ruzgarajans.vercel.app/brand-logo.png';

    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/watermarks`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: logoUrl,
          name: WATERMARK_NAME,
          opacity: 0.92,
          padding: 0.03,
          scale: 0.12,
          position: 'lowerRight',
        }),
      }
    );
    const createJson = await createRes.json();
    return (createJson?.result?.uid as string | undefined) ?? null;
  } catch {
    return null;
  }
}
