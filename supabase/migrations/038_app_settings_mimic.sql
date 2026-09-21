-- Editable mimic-video spoken cues (admin panel).
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  mimic_cues_tr text[] not null default '{}',
  mimic_cues_en text[] not null default '{}',
  mimic_speech_rate numeric not null default 1,
  mimic_pause_ms int not null default 1500,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, mimic_cues_tr, mimic_cues_en, mimic_speech_rate, mimic_pause_ms)
values (
  1,
  array[
    'Kameraya bakabilir misiniz?',
    'Gülümseyebilir misiniz?',
    'Şaşırmış gibi yapabilir misiniz?',
    'Kızgın bir ifade verebilir misiniz?',
    'Üzgün bir ifade verebilir misiniz?',
    'Tekrar gülümseyebilir misiniz?'
  ],
  array[
    'Could you look at the camera?',
    'Could you smile?',
    'Could you look surprised?',
    'Could you show an angry face?',
    'Could you show a sad face?',
    'Could you smile again?'
  ],
  1,
  1500
)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select"
  on public.app_settings for select
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.app_settings to anon, authenticated;
grant update, insert on public.app_settings to authenticated;
grant select, update, insert on public.app_settings to service_role;

