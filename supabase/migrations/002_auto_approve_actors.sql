-- Geçici: yeni oyuncular otomatik onaylı
-- Daha sonra manuel onaya dönmek için default'u tekrar 'pending' yapın.

alter table public.profiles
  alter column actor_status set default 'approved';

-- Mevcut bekleyen hesapları da aç
update public.profiles
set actor_status = 'approved'
where role = 'actor'
  and actor_status = 'pending';
