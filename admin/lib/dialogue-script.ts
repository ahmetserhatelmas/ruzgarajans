export type DialogueSpeaker = "ai" | "actor";
export type DialogueVoice = "female" | "male";

export type DialogueWordMark = { at: number; dur?: number; text?: string };

export type DialogueLine = {
  speaker: DialogueSpeaker;
  text: string;
  holdSec: number;
  audioUrl?: string;
  words?: DialogueWordMark[];
};

export type DialogueScript = {
  v: 1;
  voice: DialogueVoice;
  rate: number;
  gapSec: number;
  lines: DialogueLine[];
};

const DEFAULT_RATE = 1;
const DEFAULT_GAP = 1;

export function emptyDialogueScript(): DialogueScript {
  return { v: 1, voice: "female", rate: DEFAULT_RATE, gapSec: DEFAULT_GAP, lines: [] };
}

export function parseDialogueScript(raw?: string | null): DialogueScript {
  const fallback = emptyDialogueScript();
  if (!raw?.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<DialogueScript>;
    if (parsed && parsed.v === 1 && Array.isArray(parsed.lines)) {
      return {
        v: 1,
        voice: parsed.voice === "male" ? "male" : "female",
        rate: clampRate(parsed.rate ?? DEFAULT_RATE),
        gapSec: clampGap((parsed as { gapSec?: number }).gapSec ?? DEFAULT_GAP),
        lines: parsed.lines
          .map((line) => ({
            speaker: (line?.speaker === "actor" ? "actor" : "ai") as DialogueSpeaker,
            text: String(line?.text ?? "").trim(),
            holdSec: clampGap(
              typeof line?.holdSec === "number" ? line.holdSec : (parsed.gapSec ?? DEFAULT_GAP),
            ),
            audioUrl: typeof line?.audioUrl === "string" && line.audioUrl ? line.audioUrl : undefined,
            words: parseWordMarks(line?.words),
          }))
          .filter((line) => line.text),
      };
    }
  } catch {
    // plain / prefixed text
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(ai|yapay\s*zeka|assistant|actor|oyuncu)\s*[:\-]\s*(.*)$/i);
      if (match) {
        const tag = match[1].toLowerCase();
        const speaker: DialogueSpeaker = /actor|oyuncu/.test(tag) ? "actor" : "ai";
        return { speaker, text: match[2].trim(), holdSec: DEFAULT_GAP };
      }
      return { speaker: "ai" as const, text: line, holdSec: DEFAULT_GAP };
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
      ...(line.words?.length ? { words: line.words } : {}),
    }))
    .filter((line) => line.text);
  if (!lines.length) return "";
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
  return clampGap(typeof holdSec === "number" ? holdSec : DEFAULT_GAP);
}

function parseWordMarks(raw: unknown): DialogueWordMark[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const marks = raw
    .map((item) => {
      const at = Number((item as { at?: number })?.at);
      const dur = Number((item as { dur?: number })?.dur);
      const text = typeof (item as { text?: string })?.text === "string" ? (item as { text: string }).text : undefined;
      if (!Number.isFinite(at) || at < 0) return null;
      const mark: DialogueWordMark = { at };
      if (Number.isFinite(dur) && dur > 0) mark.dur = dur;
      if (text) mark.text = text;
      return mark;
    })
    .filter((mark): mark is DialogueWordMark => mark != null);
  return marks.length ? marks : undefined;
}

export function wordsOf(text: string) {
  const raw = text.trim().match(/\S+/g) ?? [];
  return raw.flatMap((token) => token.split(/(?<=\p{L}\p{P})(?=\p{L})/u)).filter(Boolean);
}

function lettersOf(word: string) {
  return word.replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("tr-TR");
}

function matchWord(display: string, key: string) {
  if (!display || !key) return false;
  if (display === key) return true;
  if (display.length < 2 || key.length < 2) return false;
  return display.startsWith(key) || key.startsWith(display);
}

/** Map TTS word timestamps onto on-screen tokens (punctuation / quotes differ). */
export function alignTtsMarks(text: string, marks: { at: number; dur?: number; text?: string }[]) {
  const words = wordsOf(text);
  const aligned: { at: number; dur: number; index: number }[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const key = lettersOf(mark.text ?? "");
    if (!key) continue;
    let found = -1;
    const near = Math.min(words.length, cursor + 5);
    for (let i = cursor; i < near; i += 1) {
      if (lettersOf(words[i]) === key) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      for (let i = cursor; i < near; i += 1) {
        if (matchWord(lettersOf(words[i]), key)) {
          found = i;
          break;
        }
      }
    }
    if (found >= 0) {
      aligned.push({ at: mark.at, dur: mark.dur && mark.dur > 0 ? mark.dur : 0, index: found });
      cursor = found + 1;
    }
  }
  return aligned;
}

export function wordIndexAt(text: string, charIndex: number) {
  const words = wordsOf(text);
  if (!words.length) return -1;
  const safe = Math.max(0, charIndex);
  let pos = 0;
  for (let i = 0; i < words.length; i += 1) {
    const start = text.indexOf(words[i], pos);
    if (start < 0) return i;
    const end = start + words[i].length;
    if (safe < end) return i;
    pos = end;
  }
  return words.length - 1;
}

function wordWeight(word: string) {
  const letters = word.replace(/[^\p{L}\p{N}]+/gu, "").length || 1;
  const pause = /[,.;:!?…]/.test(word) ? 1.35 : 1;
  return (1 + letters * 0.16) * pause;
}

export function wordIndexAtTime(
  marks: { at: number; index?: number; dur?: number }[],
  time: number,
) {
  if (!marks.length) return -1;
  const t = Math.max(0, time);
  let i = 0;
  while (i < marks.length - 1) {
    const cur = marks[i];
    const next = marks[i + 1];
    const spokenEnd = cur.dur && cur.dur > 0.04 ? cur.at + cur.dur : next.at;
    const switchAt = Math.max(next.at + 0.08, spokenEnd - 0.02);
    if (t >= switchAt) i += 1;
    else break;
  }
  return marks[i].index ?? i;
}

export function wordIndexAtProgress(text: string, progress: number) {
  const words = wordsOf(text);
  if (!words.length) return -1;
  const p = Math.min(1, Math.max(0, progress));
  const weights = words.map(wordWeight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let acc = 0;
  const pos = p * total;
  for (let i = 0; i < words.length; i += 1) {
    acc += weights[i];
    if (pos < acc) return i;
  }
  return words.length - 1;
}
