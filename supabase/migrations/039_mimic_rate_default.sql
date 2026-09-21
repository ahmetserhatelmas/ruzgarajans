-- Mimic guidance: normal speech rate (1.00) and the current cue lines.
alter table public.app_settings
  alter column mimic_speech_rate set default 1;

grant select on public.app_settings to anon, authenticated;
grant update, insert on public.app_settings to authenticated;
grant select, update, insert on public.app_settings to service_role;

update public.app_settings
set
  mimic_cues_tr = array[
    'Kameraya bakabilir misiniz?',
    'Gülümseyebilir misiniz?',
    'Şaşırmış gibi yapabilir misiniz?',
    'Kızgın bir ifade verebilir misiniz?',
    'Üzgün bir ifade verebilir misiniz?',
    'Tekrar gülümseyebilir misiniz?'
  ],
  mimic_cues_en = array[
    'Could you look at the camera?',
    'Could you smile?',
    'Could you look surprised?',
    'Could you show an angry face?',
    'Could you show a sad face?',
    'Could you smile again?'
  ],
  mimic_speech_rate = 1,
  updated_at = now()
where id = 1;
