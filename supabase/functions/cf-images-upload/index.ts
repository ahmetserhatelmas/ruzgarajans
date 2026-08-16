// Supabase Edge Function — Cloudflare Images direct upload URL
// Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_API_TOKEN
// (falls back to CLOUDFLARE_STREAM_API_TOKEN / CLOUDFLARE_API_TOKEN)
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
    const token =
      Deno.env.get('CLOUDFLARE_IMAGES_API_TOKEN') ||
      Deno.env.get('CLOUDFLARE_API_TOKEN') ||
      Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!accountId || !token) {
      return new Response(JSON.stringify({ error: 'Cloudflare Images not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const meta = body?.meta ?? {};
    const requireSignedURLs = Boolean(body?.requireSignedURLs);

    const form = new FormData();
    form.append('requireSignedURLs', String(requireSignedURLs));
    form.append(
      'metadata',
      JSON.stringify({
        ...meta,
        uploadedBy: userData.user.id,
      })
    );

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson?.success) {
      return new Response(JSON.stringify({ error: cfJson?.errors ?? 'CF error' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const id = cfJson.result?.id as string | undefined;
    const uploadURL = cfJson.result?.uploadURL as string | undefined;
    if (!id || !uploadURL) {
      return new Response(JSON.stringify({ error: 'Invalid CF Images response' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // upload.imagedelivery.net/{accountHash}/{imageId}
    let accountHash: string | null = null;
    try {
      const parts = new URL(uploadURL).pathname.split('/').filter(Boolean);
      if (parts.length >= 1) accountHash = parts[0] ?? null;
    } catch {
      accountHash = null;
    }

    return new Response(
      JSON.stringify({
        id,
        uploadURL,
        accountHash,
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
