// Admin-only: how much video Cloudflare Stream is storing.
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
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const token = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    if (!accountId || !token) return json({ error: 'Cloudflare not configured' }, 500);

    const headers = { Authorization: `Bearer ${token}` };
    const usageRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/storage-usage`,
      { headers }
    );
    const usageJson = await usageRes.json().catch(() => null);
    const usage = usageJson?.result ?? {};

    let bytes = 0;
    let count = 0;
    let page = 1;
    const perPage = 1000;
    while (page <= 20) {
      const listRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?per_page=${perPage}&page=${page}`,
        { headers }
      );
      const listJson = await listRes.json().catch(() => null);
      if (!listRes.ok || listJson?.success === false) break;
      const videos = Array.isArray(listJson?.result) ? listJson.result : [];
      for (const video of videos) {
        const size = Number(video?.size);
        if (Number.isFinite(size) && size > 0) bytes += size;
        count += 1;
      }
      const total = Number(listJson?.result_info?.total_count ?? videos.length);
      if (videos.length === 0 || page * perPage >= total) break;
      page += 1;
    }

    return json({
      bytes,
      count: Number(usage.videoCount ?? count),
      minutes: usage.totalStorageMinutes ?? null,
      minutesLimit: usage.totalStorageMinutesLimit ?? null,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
