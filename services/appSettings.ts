import { supabase } from '@/lib/supabase';

export type MimicGuidance = {
  lines: string[];
  rate: number;
  pauseMs: number;
};

const FALLBACK_TR = [
  'Kameraya bakabilir misiniz?',
  'Gülümseyebilir misiniz?',
  'Şaşırmış gibi yapabilir misiniz?',
  'Kızgın bir ifade verebilir misiniz?',
  'Üzgün bir ifade verebilir misiniz?',
  'Tekrar gülümseyebilir misiniz?',
];

const FALLBACK_EN = [
  'Could you look at the camera?',
  'Could you smile?',
  'Could you look surprised?',
  'Could you show an angry face?',
  'Could you show a sad face?',
  'Could you smile again?',
];

function clampRate(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.5, Math.max(0.25, n));
}

function clampPause(n: number) {
  if (!Number.isFinite(n)) return 1500;
  return Math.min(4000, Math.max(400, Math.round(n)));
}

export async function fetchMimicGuidance(locale: string): Promise<MimicGuidance> {
  const en = locale.toLowerCase().startsWith('en');
  const { data } = await supabase
    .from('app_settings')
    .select('mimic_cues_tr, mimic_cues_en, mimic_speech_rate, mimic_pause_ms')
    .eq('id', 1)
    .maybeSingle();

  const tr = (data?.mimic_cues_tr ?? []).map((s) => String(s).trim()).filter(Boolean);
  const enLines = (data?.mimic_cues_en ?? []).map((s) => String(s).trim()).filter(Boolean);
  const lines = en ? enLines : tr;
  return {
    lines: lines.length ? lines : en ? FALLBACK_EN : FALLBACK_TR,
    rate: clampRate(Number(data?.mimic_speech_rate ?? 1)),
    pauseMs: clampPause(Number(data?.mimic_pause_ms ?? 1500)),
  };
}
