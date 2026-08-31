import WebSocket from "ws";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const VERSION = "1-143.0.3650.75";
const WSS = "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1";
const VOICES = {
  female: "tr-TR-EmelNeural",
  male: "tr-TR-AhmetNeural",
} as const;
const WIN_EPOCH = BigInt("11644473600");

const HEADERS = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function requestId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function muid() {
  return crypto.randomUUID().replaceAll("-", "").toUpperCase();
}

function rfcStamp() {
  return new Date().toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");
}

function secMsGec(skewSeconds = 0) {
  const unix = BigInt(Math.floor(Date.now() / 1000 + skewSeconds)) + WIN_EPOCH;
  const rounded = unix - (unix % BigInt(300));
  const ticks = rounded * BigInt(10_000_000);
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(`${ticks}${TOKEN}`))
    .then((digest) => Buffer.from(digest).toString("hex").toUpperCase());
}

function asBuffer(data: WebSocket.RawData) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

export type TtsWordMark = { at: number; dur: number; text: string };

export type TtsResult = { audio: Buffer; words: TtsWordMark[] };

function extractMetadata(data: WebSocket.RawData): TtsWordMark[] {
  const buf = asBuffer(data);
  const text = buf.toString("utf8");
  if (!text.includes("Path:audio.metadata") && !text.includes("WordBoundary")) return [];
  const start = text.indexOf("{");
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(text.slice(start)) as {
      Metadata?: { Type?: string; Data?: { Offset?: number; Duration?: number; text?: { Text?: string } } }[];
    };
    return (parsed.Metadata ?? [])
      .filter((item) => item.Type === "WordBoundary")
      .map((item) => ({
        at: (item.Data?.Offset ?? 0) / 10_000_000,
        dur: (item.Data?.Duration ?? 0) / 10_000_000,
        text: String(item.Data?.text?.Text ?? ""),
      }))
      .filter((word) => word.text);
  } catch {
    return [];
  }
}

function extractAudio(data: WebSocket.RawData) {
  const buf = asBuffer(data);
  const separator = buf.indexOf(Buffer.from("\r\n\r\n"));
  if (separator !== -1) {
    const header = buf.subarray(0, separator).toString("utf8");
    if (header.includes("Path:audio")) {
      const audio = buf.subarray(separator + 4);
      return audio.length ? audio : null;
    }
  }
  if (buf.length >= 2) {
    const headerLen = buf.readUInt16BE(0);
    if (headerLen > 0 && headerLen + 2 < buf.length) {
      const header = buf.subarray(2, headerLen + 2).toString("utf8");
      if (header.includes("Path:audio")) {
        const audio = buf.subarray(headerLen + 2);
        return audio.length ? audio : null;
      }
    }
  }
  return null;
}

async function connectOnce(text: string, voice: "female" | "male", rate: number, skewSeconds: number) {
  const id = requestId();
  const name = VOICES[voice];
  const clamped = Math.min(1.5, Math.max(0.25, rate));
  const rel = Math.round((clamped - 1) * 100);
  const rateAttr = `${rel >= 0 ? "+" : ""}${rel}%`;
  const gec = await secMsGec(skewSeconds);
  const url = `${WSS}?Ocp-Apim-Subscription-Key=${TOKEN}&ConnectionId=${id}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${VERSION}`;
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="tr-TR"><voice name="${name}"><prosody rate="${rateAttr}">${escapeXml(text)}</prosody></voice></speak>`;

  return new Promise<TtsResult>((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        ...HEADERS,
        Cookie: `muid=${muid()};`,
        "Sec-WebSocket-Protocol": "synthesize",
      },
    });
    const chunks: Buffer[] = [];
    const words: TtsWordMark[] = [];
    let settled = false;
    let serverDate: string | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (error) {
        reject(error);
        return;
      }
      if (!chunks.length) {
        reject(new Error("Ses üretilemedi."));
        return;
      }
      resolve({ audio: Buffer.concat(chunks), words });
    };

    const timer = setTimeout(() => {
      finish(new Error("Ses üretimi zaman aşımına uğradı."));
    }, 35000);

    ws.on("unexpected-response", (_req, res) => {
      serverDate = res.headers.date;
      const err = new Error(`Unexpected server response: ${res.statusCode}`) as Error & {
        statusCode?: number;
        serverDate?: string;
      };
      err.statusCode = res.statusCode;
      err.serverDate = serverDate;
      finish(err);
    });

    ws.on("open", () => {
      const stamp = rfcStamp();
      ws.send(
        `X-Timestamp:${stamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "true" },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        })}\r\n`,
      );
      ws.send(
        `X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp}Z\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on("message", (data) => {
      const audio = extractAudio(data);
      if (audio) chunks.push(audio);
      words.push(...extractMetadata(data));
      if (asBuffer(data).toString("utf8").includes("Path:turn.end")) {
        finish();
      }
    });

    ws.on("error", (error) => {
      finish(error instanceof Error ? error : new Error("Nöral ses servisine bağlanılamadı."));
    });
  });
}

function skewFromDate(serverDate?: string) {
  if (!serverDate) return 0;
  const parsed = Date.parse(serverDate);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed - Date.now()) / 1000);
}

async function synthesizeChunk(text: string, voice: "female" | "male", rate: number) {
  try {
    return await connectOnce(text, voice, rate, 0);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    const serverDate = (error as { serverDate?: string }).serverDate;
    if (status === 403) {
      return connectOnce(text, voice, rate, skewFromDate(serverDate));
    }
    throw error;
  }
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function forceSplit(text: string, maxBytes: number) {
  const out: string[] = [];
  let rest = text.trim();
  while (byteLength(rest) > maxBytes) {
    const slice = rest.slice(0, 400);
    const cut = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf(","), slice.lastIndexOf("\n"), 80);
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function splitTtsText(text: string, maxBytes = 2400) {
  const pieces = text
    .split(/(?<=[.!?…\n])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const next = current ? `${current} ${piece}` : piece;
    if (current && byteLength(next) > maxBytes) {
      chunks.push(...forceSplit(current, maxBytes));
      current = piece;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(...forceSplit(current, maxBytes));
  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

function estimateMp3Sec(buf: Buffer) {
  return (buf.length * 8) / 48_000;
}

export async function synthesizeTurkishTimed(
  text: string,
  voice: "female" | "male",
  rate: number,
): Promise<TtsResult> {
  const chunks = splitTtsText(text);
  const audio: Buffer[] = [];
  const words: TtsWordMark[] = [];
  let shift = 0;
  for (const chunk of chunks) {
    const part = await synthesizeChunk(chunk, voice, rate);
    audio.push(part.audio);
    for (const word of part.words) {
      words.push({ ...word, at: word.at + shift });
    }
    shift += estimateMp3Sec(part.audio);
  }
  if (!audio.length) throw new Error("Ses üretilemedi.");
  return { audio: Buffer.concat(audio), words };
}

export async function synthesizeTurkish(text: string, voice: "female" | "male", rate: number) {
  return (await synthesizeTurkishTimed(text, voice, rate)).audio;
}
