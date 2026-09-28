/** Minimal Deno types so the Expo/Node TS server doesn't flag Edge Functions. */

declare namespace Deno {
  function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;

  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): any;
}
