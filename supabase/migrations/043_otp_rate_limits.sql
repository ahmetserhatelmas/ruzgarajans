-- IP / bucket rate limits for public email OTP API (service_role only)

create table if not exists public.otp_rate_limits (
  bucket text primary key,
  hits int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.otp_rate_limits enable row level security;
revoke all on public.otp_rate_limits from anon, authenticated, public;
grant all on public.otp_rate_limits to service_role;

create or replace function public.hit_otp_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.otp_rate_limits;
  now_ts timestamptz := clock_timestamp();
  retry int;
begin
  if p_bucket is null or length(p_bucket) < 3 or p_limit < 1 or p_window_seconds < 1 then
    return jsonb_build_object('ok', false, 'retryAfter', 60);
  end if;

  insert into public.otp_rate_limits (bucket, hits, window_start)
  values (p_bucket, 1, now_ts)
  on conflict (bucket) do update
  set
    hits = case
      when public.otp_rate_limits.window_start <= now_ts - make_interval(secs => p_window_seconds) then 1
      else public.otp_rate_limits.hits + 1
    end,
    window_start = case
      when public.otp_rate_limits.window_start <= now_ts - make_interval(secs => p_window_seconds) then now_ts
      else public.otp_rate_limits.window_start
    end
  returning * into r;

  if r.hits > p_limit then
    retry := greatest(
      1,
      p_window_seconds - floor(extract(epoch from (now_ts - r.window_start)))::int
    );
    return jsonb_build_object('ok', false, 'retryAfter', retry);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.hit_otp_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_otp_rate_limit(text, int, int) to service_role;
