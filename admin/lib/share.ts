import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSharePin, shareUnlockCookieName } from "@/lib/share-pin";
import type { ActorShare, Profile, SharedActorPayload } from "@/lib/types";

const PRODUCTION_SITE_URL = "https://ruzgarajans.vercel.app";

export async function sharePublicUrl(token: string) {
  const configured = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const isLocal = !host || host.includes("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = configured || (isLocal ? PRODUCTION_SITE_URL : `${proto}://${host}`);
  return `${origin.replace(/\/$/, "")}/p/${token}`;
}

export async function fetchActorShares(actorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actor_shares")
    .select("*")
    .eq("actor_id", actorId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ActorShare[];
}

export async function fetchDirectors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("role", "cast_director")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Pick<Profile, "id" | "full_name" | "email" | "role">[];
}

export async function readSharePinCookie(token: string) {
  const store = await cookies();
  const value = store.get(shareUnlockCookieName(token))?.value ?? "";
  return isSharePin(value) ? value : null;
}

export type SharedActorOpen =
  | { status: "ok"; data: SharedActorPayload }
  | { status: "pin_required" | "bad_pin" | "unavailable" };

export async function fetchSharedActor(token: string, pin?: string | null): Promise<SharedActorOpen> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_actor_share", {
    p_token: token,
    p_pin: pin || null,
  });
  if (error || !data) return { status: "unavailable" };
  const row = data as SharedActorPayload & { error?: string };
  if (row.error === "pin_required" || row.error === "bad_pin" || row.error === "unavailable") {
    return { status: row.error };
  }
  if (!row.profile) return { status: "unavailable" };
  return { status: "ok", data: row };
}
