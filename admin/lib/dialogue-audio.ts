import type { SupabaseClient } from "@supabase/supabase-js";
import { synthesizeTurkishTimed } from "@/lib/edge-tts";
import { stringifyDialogueScript, type DialogueScript } from "@/lib/dialogue-script";

export async function attachDialogueAudio(
  supabase: SupabaseClient,
  castId: string,
  script: DialogueScript,
) {
  const next: DialogueScript = { ...script, lines: [...script.lines] };
  for (let i = 0; i < next.lines.length; i += 1) {
    const line = next.lines[i];
    if (line.speaker !== "ai" || !line.text.trim()) {
      next.lines[i] = { ...line, audioUrl: undefined };
      continue;
    }
    try {
      const { audio, words } = await synthesizeTurkishTimed(line.text, script.voice, script.rate);
      const path = `${castId}/${i}-${Date.now()}.mp3`;
      const { error } = await supabase.storage.from("dialogue-audio").upload(path, audio, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("dialogue-audio").getPublicUrl(path);
      next.lines[i] = {
        ...line,
        audioUrl: data.publicUrl,
        words: words.map(({ at, text }) => ({ at, text })),
      };
    } catch (error) {
      console.error("dialogue audio failed", error);
    }
  }
  return stringifyDialogueScript(next);
}
