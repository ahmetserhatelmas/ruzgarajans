export type DialogueSpeaker = "ai" | "actor";
export type DialogueVoice = "female" | "male";

export type DialogueWordMark = { at: number; text?: string };

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

export function lineAfterSec(holdSec?: number) {
  return clampGap(typeof holdSec === "number" ? holdSec : DEFAULT_GAP);
}

function parseWordMarks(raw: unknown): DialogueWordMark[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const marks = raw
    .map((item) => {
      const at = Number((item as { at?: number })?.at);
      const text = typeof (item as { text?: string })?.text === "string" ? (item as { text: string }).text : undefined;
      if (!Number.isFinite(at) || at < 0) return null;
      return text ? { at, text } : { at };
    })
    .filter((mark): mark is DialogueWordMark => mark != null);
  return marks.length ? marks : undefined;
}

export function wordsOf(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function lettersOf(word: string) {
  return word.replace(/[^\p{L}\p{N}]+/gu, "").toLocaleLowerCase("tr-TR");
}

/** Map TTS word timestamps onto on-screen tokens (punctuation / quotes differ). */
export function alignTtsMarks(text: string, marks: { at: number; text?: string }[]) {
  const words = wordsOf(text);
  const aligned: { at: number; index: number }[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const key = lettersOf(mark.text ?? "");
    if (!key) continue;
    let found = -1;
    for (let i = cursor; i < words.length; i += 1) {
      const display = lettersOf(words[i]);
      if (display && (display === key || display.startsWith(key) || key.startsWith(display))) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      aligned.push({ at: mark.at, index: found });
      cursor = found + 1;
    }
  }
  return aligned;
}

export function wordIndexAt(text: string, charIndex: number) {
  const safe = Math.max(0, charIndex);
  let seen = 0;
  const words = wordsOf(text);
  for (let i = 0; i < words.length; i += 1) {
    const start = text.indexOf(words[i], seen);
    if (start < 0) return i;
    const end = start + words[i].length;
    if (safe < end) return i;
    seen = end;
  }
  return Math.max(0, words.length - 1);
}

function wordWeight(word: string) {
  const letters = word.replace(/[^\p{L}\p{N}]+/gu, "").length || 1;
  const pause = /[,.;:!?…]/.test(word) ? 1.35 : 1;
  return (1 + letters * 0.16) * pause;
}

/** progress 0..1 → word index, longer / punctuated words take more time */
export function wordIndexAtTime(marks: { at: number; index?: number }[], time: number) {
  if (!marks.length) return -1;
  let i = 0;
  while (i < marks.length - 1 && time >= marks[i + 1].at) i += 1;
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
