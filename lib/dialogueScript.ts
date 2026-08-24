export type DialogueSpeaker = 'ai' | 'actor';
export type DialogueVoice = 'female' | 'male';

export type DialogueLine = {
  speaker: DialogueSpeaker;
  text: string;
  holdSec: number;
  audioUrl?: string;
};

export type DialogueScript = {
  v: 1;
  voice: DialogueVoice;
  rate: number;
  gapSec: number;
  lines: DialogueLine[];
};

const DEFAULT_RATE = 0.65;
const DEFAULT_GAP = 1;

export function emptyDialogueScript(): DialogueScript {
  return { v: 1, voice: 'female', rate: DEFAULT_RATE, gapSec: DEFAULT_GAP, lines: [] };
}

export function parseDialogueScript(raw?: string | null): DialogueScript {
  const fallback = emptyDialogueScript();
  if (!raw?.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<DialogueScript>;
    if (parsed && parsed.v === 1 && Array.isArray(parsed.lines)) {
      return {
        v: 1,
        voice: parsed.voice === 'male' ? 'male' : 'female',
        rate: clampRate(parsed.rate ?? DEFAULT_RATE),
        gapSec: clampGap((parsed as { gapSec?: number }).gapSec ?? DEFAULT_GAP),
        lines: parsed.lines
          .map((line) => ({
            speaker: (line?.speaker === 'actor' ? 'actor' : 'ai') as DialogueSpeaker,
            text: String(line?.text ?? '').trim(),
            holdSec: clampGap(
              typeof line?.holdSec === 'number' ? line.holdSec : (parsed.gapSec ?? DEFAULT_GAP),
            ),
            audioUrl: typeof line?.audioUrl === 'string' && line.audioUrl ? line.audioUrl : undefined,
          }))
          .filter((line) => line.text),
      };
    }
  } catch {
    // plain / prefixed text
  }

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(ai|yapay\s*zeka|assistant|actor|oyuncu)\s*[:\-]\s*(.*)$/i);
      if (match) {
        const tag = match[1].toLowerCase();
        const speaker: DialogueSpeaker = /actor|oyuncu/.test(tag) ? 'actor' : 'ai';
        return { speaker, text: match[2].trim(), holdSec: DEFAULT_GAP };
      }
      return { speaker: 'ai' as const, text: line, holdSec: DEFAULT_GAP };
    })
    .filter((line) => line.text);

  return { ...fallback, lines };
}

export function stringifyDialogueScript(script: DialogueScript) {
  const lines = script.lines
    .map((line) => ({
      speaker: line.speaker,
      text: line.text.trim(),
      holdSec: clampGap(line.holdSec),
      ...(line.audioUrl ? { audioUrl: line.audioUrl } : {}),
    }))
    .filter((line) => line.text);
  if (!lines.length) return '';
  return JSON.stringify({
    v: 1,
    voice: script.voice,
    rate: clampRate(script.rate),
    gapSec: clampGap(script.gapSec),
    lines,
  });
}

export function clampRate(rate: number) {
  if (!Number.isFinite(rate)) return DEFAULT_RATE;
  return Math.min(1.5, Math.max(0.25, rate));
}

export function clampGap(sec: number) {
  if (!Number.isFinite(sec)) return DEFAULT_GAP;
  return Math.min(8, Math.max(0, sec));
}

export function estimateActorHoldMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2500, words * 450);
}

export function lineAfterSec(holdSec?: number) {
  return clampGap(typeof holdSec === 'number' ? holdSec : DEFAULT_GAP);
}

export function wordsOf(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function wordIndexAt(text: string, charIndex: number) {
  const safe = Math.max(0, charIndex);
  let seen = 0;
  const words = wordsOf(text);
  for (let i = 0; i < words.length; i += 1) {
    const start = text.indexOf(words[i], seen);
    const end = start + words[i].length;
    if (safe < end) return i;
    seen = end;
  }
  return Math.max(0, words.length - 1);
}
