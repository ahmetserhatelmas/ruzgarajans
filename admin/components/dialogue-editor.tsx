"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyDialogueScript,
  lineAfterSec,
  parseDialogueScript,
  stringifyDialogueScript,
  alignTtsMarks,
  wordIndexAt,
  wordIndexAtProgress,
  wordIndexAtTime,
  type DialogueLine,
  type DialogueScript,
  type DialogueVoice,
} from "@/lib/dialogue-script";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function DialogueEditor({ defaultValue }: { defaultValue?: string | null }) {
  const [script, setScript] = useState<DialogueScript>(() => {
    const parsed = parseDialogueScript(defaultValue);
    return parsed.lines.length
      ? parsed
      : { ...emptyDialogueScript(), lines: [{ speaker: "ai", text: "", holdSec: 1 }] };
  });
  const [playing, setPlaying] = useState(false);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    speaker: DialogueLine["speaker"];
    text: string;
    wordIndex: number;
    waitLeft?: number;
  } | null>(null);
  const stopRef = useRef(false);
  const runId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightRaf = useRef<number | null>(null);
  const scriptRef = useRef(script);
  scriptRef.current = script;

  const json = useMemo(() => stringifyDialogueScript(script), [script]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
      audioRef.current?.pause();
      if (highlightRaf.current != null) cancelAnimationFrame(highlightRaf.current);
      stopRef.current = true;
    };
  }, []);

  const updateLine = (index: number, patch: Partial<DialogueLine>) => {
    setScript((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  };

  const stopHighlight = () => {
    if (highlightRaf.current != null) {
      cancelAnimationFrame(highlightRaf.current);
      highlightRaf.current = null;
    }
  };

  const stopPreview = () => {
    runId.current += 1;
    stopRef.current = true;
    stopHighlight();
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setPreview(null);
  };

  const waitLive = async (getMs: () => number, id: number) => {
    const started = Date.now();
    while (runId.current === id && !stopRef.current) {
      const target = Math.max(0, getMs());
      const left = target - (Date.now() - started);
      if (left <= 0) break;
      setPreview((prev) => (prev ? { ...prev, waitLeft: left } : prev));
      await wait(Math.min(80, left));
    }
    setPreview((prev) => (prev ? { ...prev, waitLeft: undefined } : prev));
  };

  const followAudio = (audio: HTMLAudioElement, text: string, marks: { at: number; text?: string }[]) => {
    stopHighlight();
    const aligned = alignTtsMarks(text, marks);
    const tick = () => {
      if (stopRef.current || audio !== audioRef.current) return;
      const time = audio.currentTime;
      const index = aligned.length
        ? wordIndexAtTime(aligned, time)
        : Number.isFinite(audio.duration) && audio.duration > 0
          ? wordIndexAtProgress(text, time / audio.duration)
          : 0;
      setPreview((prev) => (prev && prev.wordIndex !== index ? { ...prev, wordIndex: index } : prev));
      if (!audio.paused && !audio.ended && !stopRef.current) {
        highlightRaf.current = requestAnimationFrame(tick);
      }
    };
    highlightRaf.current = requestAnimationFrame(tick);
  };

  const speakNeural = async (text: string) => {
    const { voice, rate } = scriptRef.current;
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
    });
    if (!res.ok) throw new Error("neural");
    const payload = (await res.json()) as { audio?: string; words?: { at: number }[] };
    if (!payload.audio) throw new Error("neural");
    const bytes = Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    const marks = Array.isArray(payload.words) ? payload.words : [];
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => followAudio(audio, text, marks);
      audio.ontimeupdate = () => {
        if (highlightRaf.current == null && !audio.paused) followAudio(audio, text, marks);
      };
      audio.onended = () => {
        stopHighlight();
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        stopHighlight();
        URL.revokeObjectURL(url);
        reject(new Error("audio"));
      };
      void audio.play();
    });
  };

  const speakBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      const turkish = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith("tr"));
      const utterance = new SpeechSynthesisUtterance(text);
      const preferred =
        turkish.find((voice) =>
          scriptRef.current.voice === "male"
            ? /male|erkek|tolga|ahmet/i.test(voice.name)
            : /female|kadın|yelda|emel|filiz/i.test(voice.name),
        ) ?? turkish[0];
      if (preferred) utterance.voice = preferred;
      utterance.lang = "tr-TR";
      utterance.rate = Math.min(2, Math.max(0.1, scriptRef.current.rate));
      utterance.pitch = 1;
      utterance.onboundary = (event) => {
        if (event.name && event.name !== "word") return;
        const index = wordIndexAt(text, event.charIndex ?? 0);
        setPreview((prev) => (prev && prev.wordIndex !== index ? { ...prev, wordIndex: index } : prev));
      };
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

  const speakLine = async (text: string) => {
    try {
      await speakNeural(text);
      setPreviewHint(null);
    } catch {
      setPreviewHint("Nöral ses bağlanamadı; tarayıcı sesi kullanılıyor.");
      await speakBrowser(text);
    }
  };

  const playPreview = async () => {
    const lines = scriptRef.current.lines.filter((line) => line.text.trim());
    if (!lines.length) return;
    runId.current += 1;
    const id = runId.current;
    stopRef.current = false;
    stopHighlight();
    setPlaying(true);
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    audioRef.current?.pause();
    await wait(80);
    if (runId.current !== id) return;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (runId.current !== id || stopRef.current) break;
      const words = line.text.trim().split(/\s+/);
      setPreview({
        speaker: line.speaker,
        text: line.text.trim(),
        wordIndex: line.speaker === "ai" ? 0 : -1,
      });
      if (line.speaker === "ai") {
        await speakLine(line.text.trim());
        if (runId.current !== id) return;
        setPreview((prev) => (prev ? { ...prev, wordIndex: words.length } : prev));
      } else {
        await waitLive(() => Math.max(1200, words.length * 450), id);
      }
      if (runId.current !== id || stopRef.current) break;
      if (i < lines.length - 1) {
        await waitLive(() => {
          const live = scriptRef.current.lines.filter((item) => item.text.trim())[i];
          return lineAfterSec(live?.holdSec) * 1000;
        }, id);
      }
    }
    if (runId.current === id) {
      setPlaying(false);
      if (!stopRef.current) setPreview(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <input type="hidden" name="dialogue_script" value={json} />
      <p className="text-sm text-muted-foreground">
        İlk satır oyuncu veya yapay zeka olabilir. Yapay zeka satırını sesli okur.
        Oyuncu satırında ses susar, metin ekranda kalır; oyuncu kendini çekerken onu okur.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Yapay zeka sesi</Label>
          <select
            value={script.voice}
            onChange={(e) => setScript((prev) => ({ ...prev, voice: e.target.value as DialogueVoice }))}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Okuma hızı ({script.rate.toFixed(2)})</Label>
          <input
            type="range"
            min={0.25}
            max={1.5}
            step={0.05}
            value={script.rate}
            onChange={(e) => setScript((prev) => ({ ...prev, rate: Number(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground">
            0.25 çok yavaş · 1.00 normal · 1.50 hızlı. Telefonda aynı ses için ilanı kaydet.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void playPreview()}>
          {playing ? "Baştan test et" : "Sesi test et"}
        </Button>
        {playing ? (
          <Button type="button" variant="outline" onClick={stopPreview}>
            Durdur
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Kadın: Emel · Erkek: Ahmet. Her replikte “sonra bekle” ayrı ayarlanır; testte kaydırınca hemen uygulanır.
        </p>
        {previewHint ? <p className="w-full text-xs text-destructive">{previewHint}</p> : null}
      </div>
      {preview ? (
        <div className="rounded-lg bg-primary/5 px-3 py-3 text-sm">
          <p className="mb-1 text-xs font-medium text-primary">
            {preview.waitLeft && preview.waitLeft > 80
              ? `Bu replikten sonra ${(preview.waitLeft / 1000).toFixed(1)} sn — o satırın kaydırıcısını değiştir`
              : preview.speaker === "ai"
                ? "Yapay zeka konuşuyor"
                : "Oyuncu satırı — ses kapalı"}
          </p>
          <p className="leading-7">
            {preview.text.split(/\s+/).map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={
                  preview.speaker === "ai" && i === preview.wordIndex
                    ? "rounded bg-primary px-1 font-semibold text-primary-foreground"
                    : "text-foreground"
                }
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {script.lines.map((line, index) => (
          <div key={index} className="grid gap-2 rounded-lg bg-muted/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={line.speaker}
                onChange={(e) => updateLine(index, { speaker: e.target.value as DialogueLine["speaker"] })}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="ai">Yapay zeka konuşur</option>
                <option value="actor">Oyuncu okur (sessiz)</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setScript((prev) => ({
                    ...prev,
                    lines: prev.lines.filter((_, i) => i !== index),
                  }))
                }
              >
                Sil
              </Button>
            </div>
            <Textarea
              rows={2}
              value={line.text}
              onChange={(e) => updateLine(index, { text: e.target.value })}
              placeholder={
                line.speaker === "ai"
                  ? "Yapay zekanın söyleyeceği replik"
                  : "Oyuncunun ekrandan okuyacağı replik"
              }
            />
            <div className="grid gap-1">
              <Label className="text-xs">
                {line.speaker === "ai" ? "Konuştuktan sonra" : "Oyuncu okuduktan sonra"} (
                {lineAfterSec(line.holdSec).toFixed(1)} sn)
              </Label>
              <input
                type="range"
                min={0}
                max={8}
                step={0.25}
                value={lineAfterSec(line.holdSec)}
                onChange={(e) => updateLine(index, { holdSec: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Bu satır bitince sonraki repliğe kadar bekler. 3 sn veya 5 sn ayrı verilebilir.</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setScript((prev) => ({
            ...prev,
            lines: [
              ...prev.lines,
              {
                speaker: prev.lines.at(-1)?.speaker === "ai" ? "actor" : "ai",
                text: "",
                holdSec: 1,
              },
            ],
          }))
        }
      >
        Replik ekle
      </Button>
    </div>
  );
}
