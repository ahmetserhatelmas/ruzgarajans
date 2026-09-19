const MEDIA_BUCKETS = ["avatars", "covers", "gallery"] as const;

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      list: (
        path?: string,
        options?: { limit?: number; offset?: number },
      ) => Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
      remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function removeUserMediaFiles(supabase: StorageClient, userIds: string[]) {
  for (const userId of userIds) {
    for (const bucket of MEDIA_BUCKETS) {
      const paths: string[] = [];
      let offset = 0;
      for (;;) {
        const { data, error } = await supabase.storage.from(bucket).list(userId, {
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
        await supabase.storage.from(bucket).remove(paths);
      }
    }
  }
}
