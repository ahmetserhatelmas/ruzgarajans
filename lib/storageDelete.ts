import type { SupabaseClient } from '@supabase/supabase-js';

const MEDIA_BUCKETS = ['avatars', 'covers', 'gallery'] as const;

export async function removeUserMediaFiles(client: SupabaseClient, userIds: string[]) {
  for (const userId of userIds) {
    for (const bucket of MEDIA_BUCKETS) {
      const paths: string[] = [];
      let offset = 0;
      for (;;) {
        const { data, error } = await client.storage.from(bucket).list(userId, {
          limit: 100,
          offset,
        });
        if (error || !data?.length) break;
        for (const item of data) {
          if (item.name) paths.push(`${userId}/${item.name}`);
        }
        if (data.length < 100) break;
        offset += data.length;
      }
      if (paths.length) {
        await client.storage.from(bucket).remove(paths);
      }
    }
  }
}
