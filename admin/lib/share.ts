import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSharePin, shareUnlockCookieName } from "@/lib/share-pin";
import type {
  ActorShare,
  ApplicationShare,
  Profile,
  SharedActorPayload,
  SharedApplicationPayload,
} from "@/lib/types";

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

export async function purgeExpiredActorShares() {
  const supabase = await createClient();
  await supabase
    .from("actor_shares")
    .delete()
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString());
}

export async function fetchActorShares(actorId: string) {
  const supabase = await createClient();
  await purgeExpiredActorShares();
  const { data, error } = await supabase
    .from("actor_shares")
    .select("*")
    .is("revoked_at", null)
    .or(`actor_id.eq.${actorId},actor_ids.cs.{${actorId}}`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ActorShare[]).filter(
    (share) => !share.expires_at || new Date(share.expires_at).getTime() > Date.now()
  );
}

export async function fetchActiveActorShares() {
  const supabase = await createClient();
  await purgeExpiredActorShares();
  const { data, error } = await supabase
    .from("actor_shares")
    .select("*")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ActorShare[]).filter(
    (share) => !share.expires_at || new Date(share.expires_at).getTime() > Date.now()
  );
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
  | { status: "ok"; items: SharedActorPayload[] }
  | { status: "pin_required" | "bad_pin" | "unavailable" };

function shareItems(row: SharedActorPayload & { error?: string; items?: SharedActorPayload[] }) {
  if (Array.isArray(row.items) && row.items.length) {
    return row.items.filter((item) => item?.profile);
  }
  if (row.profile) return [row];
  return [];
}

export async function fetchSharedActor(token: string, pin?: string | null): Promise<SharedActorOpen> {
  const supabase = await createClient();
  const safePin = isSharePin(pin ?? "") ? pin : null;
  const { data, error } = await supabase.rpc("open_actor_share", {
    p_token: token,
    p_pin: safePin,
  });
  if (error || !data) return { status: "unavailable" };
  const row = data as SharedActorPayload & { error?: string; items?: SharedActorPayload[] };
  if (row.error === "pin_required" || row.error === "bad_pin" || row.error === "unavailable") {
    return { status: row.error };
  }
  const items = shareItems(row);
  if (!safePin || items.length === 0) return { status: safePin ? "unavailable" : "pin_required" };
  return { status: "ok", items };
}

export async function purgeExpiredApplicationShares() {
  const supabase = await createClient();
  await supabase
    .from("application_shares")
    .delete()
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString());
}

export async function fetchApplicationShares(applicationId: string) {
  const supabase = await createClient();
  await purgeExpiredApplicationShares();
  const { data, error } = await supabase
    .from("application_shares")
    .select("*")
    .is("revoked_at", null)
    .or(`application_id.eq.${applicationId},application_ids.cs.{${applicationId}}`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ApplicationShare[]).filter(
    (share) => !share.expires_at || new Date(share.expires_at).getTime() > Date.now()
  );
}

export async function fetchActiveApplicationShares() {
  const supabase = await createClient();
  await purgeExpiredApplicationShares();
  const { data, error } = await supabase
    .from("application_shares")
    .select("*")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ApplicationShare[]).filter(
    (share) => !share.expires_at || new Date(share.expires_at).getTime() > Date.now()
  );
}

export type SharedApplicationOpen =
  | { status: "ok"; items: SharedApplicationPayload[] }
  | { status: "pin_required" | "bad_pin" | "unavailable" };

function applicationShareItems(
  row: { error?: string; items?: SharedApplicationPayload[] }
) {
  if (Array.isArray(row.items) && row.items.length) {
    return row.items.filter((item) => item?.application?.id);
  }
  return [];
}

export async function fetchSharedApplication(
  token: string,
  pin?: string | null
): Promise<SharedApplicationOpen> {
  const supabase = await createClient();
  const safePin = isSharePin(pin ?? "") ? pin : null;
  const { data, error } = await supabase.rpc("open_application_share", {
    p_token: token,
    p_pin: safePin,
  });
  if (error || !data) return { status: "unavailable" };
  const row = data as { error?: string; items?: SharedApplicationPayload[] };
  if (row.error === "pin_required" || row.error === "bad_pin" || row.error === "unavailable") {
    return { status: row.error };
  }
  const items = applicationShareItems(row);
  if (!safePin || items.length === 0) return { status: safePin ? "unavailable" : "pin_required" };
  return { status: "ok", items };
}
