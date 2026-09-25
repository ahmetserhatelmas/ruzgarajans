"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveMimicSettingsAction } from "@/lib/actions";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function linesOf(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function clampRate(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1.5, Math.max(0.25, value));
}

function clampPause(value: number) {
  if (!Number.isFinite(value)) return 1500;
  return Math.min(4000, Math.max(400, Math.round(value)));
}

function pickVoice(lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.toLowerCase().slice(0, 2);
  const sameLang = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  return (
    sameLang.find((voice) => /female|kadın|yelda|emel|filiz|jenny|aria|samantha/i.test(voice.name)) ??
    sameLang[0]
  );
}

export function MimicSettingsForm({
  cuesTr,
  cuesEn,
  rate,
  pauseMs,
}: {
  cuesTr: string;
  cuesEn: string;
  rate: number;
  pauseMs: number;
}) {
  const [speechRate, setSpeechRate] = useState(() => clampRate(rate));
  const [playing, setPlaying] = useState(false);
  const [previewLang, setPreviewLang] = useState<"tr" | "en">("tr");
  const [currentLine, setCurrentLine] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const stopRef = useRef(false);
  const runId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    const src = audio.src;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  };

  const stopPreview = () => {
    stopRef.current = true;
    runId.current += 1;
    stopAudio();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPlaying(false);
    setCurrentLine(null);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", warm);
      stopPreview();
    };
  }, []);

  const speakBrowser = (text: string, lang: string, previewRate: number) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.lang = lang;
      utterance.rate = previewRate;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

  const speakNeural = async (text: string, lang: "tr" | "en", previewRate: number) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "female", rate: previewRate, lang }),
    });
    if (!res.ok) throw new Error("neural");
    const payload = (await res.json()) as { audio?: string };
    if (!payload.audio) throw new Error("neural");
    const bytes = Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        if (audioRef.current === audio) audioRef.current = null;
        URL.revokeObjectURL(url);
        reject(new Error("audio"));
      };
      void audio.play().catch(() => {
        URL.revokeObjectURL(url);
        reject(new Error("audio"));
      });
    });
  };

  const speakLine = async (text: string, lang: "tr" | "en", previewRate: number) => {
    try {
      await speakNeural(text, lang, previewRate);
      setHint(null);
    } catch {
      setHint("Nöral ses bağlanamadı; tarayıcı sesi kullanılıyor.");
      await speakBrowser(text, lang === "en" ? "en-US" : "tr-TR", previewRate);
    }
  };

  const playPreview = async (form: HTMLFormElement) => {
    stopRef.current = false;
    const id = (runId.current += 1);
    stopAudio();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    const data = new FormData(form);
    const lang = previewLang;
    const lines = linesOf(String(data.get(lang === "en" ? "mimic_cues_en" : "mimic_cues_tr") ?? ""));
    const previewRate = clampRate(speechRate);
    const pause = clampPause(Number(String(data.get("mimic_pause_ms") ?? "1500")));
    if (!lines.length) {
      setHint(lang === "en" ? "English sentences are empty." : "Türkçe cümleler boş.");
      return;
    }
    setHint(null);
    setPlaying(true);
    for (const line of lines) {
      if (stopRef.current || runId.current !== id) return;
      setCurrentLine(line);
      await speakLine(line, lang, previewRate);
      if (stopRef.current || runId.current !== id) return;
      await wait(pause);
    }
    if (runId.current === id) {
      setPlaying(false);
      setCurrentLine(null);
    }
  };

  return (
    <form action={saveMimicSettingsAction} className="grid max-w-2xl gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="grid gap-1.5">
        <Label htmlFor="mimic_cues_tr">Cümleler (Türkçe)</Label>
        <Textarea id="mimic_cues_tr" name="mimic_cues_tr" required rows={8} defaultValue={cuesTr} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mimic_cues_en">Sentences (English)</Label>
        <Textarea id="mimic_cues_en" name="mimic_cues_en" rows={8} defaultValue={cuesEn} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="mimic_speech_rate">Okuma hızı ({speechRate.toFixed(2)})</Label>
          <input
            id="mimic_speech_rate"
            name="mimic_speech_rate"
            type="range"
            min={0.25}
            max={1.5}
            step={0.05}
            value={speechRate}
            onChange={(e) => setSpeechRate(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            0.25 çok yavaş · 1.00 normal · 1.50 hızlı. Telefonda aynı hızla okunur.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mimic_pause_ms">Cümle arası bekleme (ms)</Label>
          <Input
            id="mimic_pause_ms"
            name="mimic_pause_ms"
            type="number"
            step="100"
            min="400"
            max="4000"
            defaultValue={String(pauseMs)}
          />
          <p className="text-xs text-muted-foreground">1500 = bir buçuk saniye bekler.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={previewLang}
          onChange={(e) => setPreviewLang(e.target.value === "en" ? "en" : "tr")}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          aria-label="Dinlenecek dil"
        >
          <option value="tr">Türkçe dinle</option>
          <option value="en">English preview</option>
        </select>
        <Button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (form) void playPreview(form);
          }}
        >
          {playing ? "Baştan dinle" : "Dinle"}
        </Button>
        {playing ? (
          <Button type="button" variant="outline" onClick={stopPreview}>
            Durdur
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          İlandaki gibi nöral ses (Emel / Jenny). Kaydetmeden, şu anki hız ve beklemeyle duyar.
        </p>
      </div>
      {hint ? <p className="text-xs text-destructive">{hint}</p> : null}
      {currentLine ? (
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
          <span className="mb-0.5 block text-xs font-medium text-primary">Şimdi okunan</span>
          {currentLine}
        </p>
      ) : null}
      <Button type="submit">Kaydet</Button>
    </form>
  );
}
