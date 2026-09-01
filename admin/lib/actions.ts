"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createAuthUser,
  parseNewPassword,
  setAuthPassword,
  siteUrl,
} from "@/lib/supabase/admin";
import { notifyMatchingActors, notifyOptionedActor } from "@/lib/notify-cast";
import { attachDialogueAudio } from "@/lib/dialogue-audio";
import { parseDialogueScript } from "@/lib/dialogue-script";
import { ADMIN_PERMS, requireAdminPerm, type AdminPerm } from "@/lib/permissions";
import { fetchSharedActor, fetchSharedApplication } from "@/lib/share";
import { hashSharePin, isSharePin, parseShareInput, shareUnlockCookieName } from "@/lib/share-pin";
import type { ActorStatus, ApplicationStatus, CastListing, GenderPref } from "@/lib/types";
import { cookies } from "next/headers";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!password) {
    redirect(`/login?error=${encodeURIComponent("Şifre yaz veya aşağıdaki linkle yeni şifre belirle.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?error=admin");
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/login?error=${encodeURIComponent("E-posta gerekli.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/login/update-password`,
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?ok=${encodeURIComponent("Şifre belirleme linki e-postana gönderildi.")}`);
}

export async function updateOwnPasswordAction(formData: FormData) {
  const next = String(formData.get("next") ?? "/account");
  const parsed = parseNewPassword(formData, true);
  if (parsed.error) {
    redirect(`${next}?error=${encodeURIComponent(parsed.error)}`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    redirect(`${next}?error=${encodeURIComponent(error.message)}`);
  }
  if (next.startsWith("/login")) {
    redirect("/?ok=" + encodeURIComponent("Şifre kaydedildi."));
  }
  redirect(`${next}?ok=${encodeURIComponent("Şifre kaydedildi.")}`);
}

export async function deleteActorsAction(ids: string[]) {
  await requireAdminPerm("actors");
  const unique = [...new Set(ids)].filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  );
  if (!unique.length) return { ok: false as const, count: 0, error: "Oyuncu seç." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_actors", { p_ids: unique });
  if (error) return { ok: false as const, count: 0, error: error.message };
  revalidatePath("/actors");
  revalidatePath("/");
  return { ok: true as const, count: Number(data ?? 0) };
}

export async function setActorStatusAction(id: string, status: ActorStatus) {
  await requireAdminPerm("actor_approvals");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ actor_status: status })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/actors");
  revalidatePath(`/actors/${id}`);
  revalidatePath("/");
}

export async function setApplicationStatusAction(id: string, status: ApplicationStatus) {
  await requireAdminPerm("applications");
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/casts");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteApplicationAction(id: string) {
  const result = await deleteApplicationsAction([id]);
  if (!result.ok) throw new Error(result.error);
  redirect("/applications");
}

export async function deleteApplicationsAction(ids: string[]) {
  await requireAdminPerm("applications");
  const unique = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (!unique.length) return { ok: false as const, count: 0, error: "Başvuru seç." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().in("id", unique);
  if (error) return { ok: false as const, count: 0, error: error.message };
  revalidatePath("/applications");
  revalidatePath("/casts");
  return { ok: true as const, count: unique.length };
}

export async function upsertCastAction(formData: FormData) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const payload = {
    project_name: String(formData.get("project_name") ?? "").trim(),
    role_name: String(formData.get("role_name") ?? "").trim(),
    role_description: String(formData.get("role_description") ?? "").trim(),
    age_min: numOrNull(formData.get("age_min")),
    age_max: numOrNull(formData.get("age_max")),
    gender: String(formData.get("gender") ?? "any") as GenderPref,
    height_min_cm: numOrNull(formData.get("height_min_cm")),
    height_max_cm: numOrNull(formData.get("height_max_cm")),
    nationalities: formData
      .getAll("nationalities")
      .map((value) => String(value).trim().toUpperCase())
      .filter(Boolean),
    languages: formData
      .getAll("languages")
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean),
    shoot_location: emptyToNull(formData.get("shoot_location")),
    shoot_date: dateOrNull(formData.get("shoot_date")),
    deadline: dateOrNull(formData.get("deadline")),
    option_date: dateOrNull(formData.get("option_date")),
    payment_due_date: dateOrNull(formData.get("payment_due_date")),
    budget_amount: numOrNull(formData.get("budget_amount")),
    budget_currency: "TRY",
    allow_budget_counter: formData.get("allow_budget_counter") === "on",
    is_published: formData.get("is_published") === "on",
    requires_video: formData.get("requires_video") === "on",
    dialogue_script: emptyToNull(formData.get("dialogue_script")),
    dialogue_mode: String(formData.get("dialogue_script") ?? "").trim()
      ? "script_tts"
      : "none",
    cover_image_url: undefined as string | null | undefined,
  };
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    payload.cover_image_url = await uploadCastLogo(supabase, user.id, logo);
  } else if (formData.get("remove_logo") === "on") {
    payload.cover_image_url = null;
  }
  if (!payload.requires_video) {
    payload.dialogue_script = null;
    payload.dialogue_mode = "none";
  }

  if (!payload.project_name || !payload.role_name || !payload.role_description) {
    throw new Error("Proje, rol ve açıklama zorunlu.");
  }
  if (payload.cover_image_url === undefined) {
    delete (payload as { cover_image_url?: string | null }).cover_image_url;
  }

  if (id) {
    const { data: previous } = await supabase
      .from("cast_listings")
      .select("is_published")
      .eq("id", id)
      .maybeSingle();
    if (payload.dialogue_script) {
      payload.dialogue_script = await attachDialogueAudio(
        supabase,
        id,
        parseDialogueScript(payload.dialogue_script),
      );
    }
    const { error } = await supabase.from("cast_listings").update(payload).eq("id", id);
    if (error) throw error;
    if (payload.is_published && !previous?.is_published) {
      try {
        await notifyMatchingActors({ id, ...payload });
      } catch (err) {
        console.error("cast notify failed", err);
      }
    }
    revalidatePath("/casts");
    revalidatePath(`/casts/${id}`);
    redirect(`/casts/${id}`);
  }

  const { data, error } = await supabase
    .from("cast_listings")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  if (payload.dialogue_script) {
    const script = await attachDialogueAudio(
      supabase,
      data.id,
      parseDialogueScript(payload.dialogue_script),
    );
    await supabase.from("cast_listings").update({ dialogue_script: script }).eq("id", data.id);
  }
  if (payload.is_published) {
    try {
      await notifyMatchingActors({ id: data.id, ...payload });
    } catch (err) {
      console.error("cast notify failed", err);
    }
  }
  revalidatePath("/casts");
  redirect(`/casts/${data.id}`);
}

export async function toggleCastPublishedAction(id: string, isPublished: boolean) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const { error } = await supabase
    .from("cast_listings")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw error;
  if (isPublished) {
    const { data: cast } = await supabase
      .from("cast_listings")
      .select(
        "id, project_name, role_name, is_published, gender, age_min, age_max, nationalities, languages"
      )
      .eq("id", id)
      .maybeSingle();
    if (cast) {
      try {
        await notifyMatchingActors(cast as CastListing);
      } catch (err) {
        console.error("cast notify failed", err);
      }
    }
  }
  revalidatePath("/casts");
  revalidatePath(`/casts/${id}`);
}

export async function introduceActorToCastFormAction(formData: FormData) {
  const castId = String(formData.get("cast_id") ?? "");
  const actorId = String(formData.get("actor_id") ?? "");
  await introduceActorToCastAction(castId, actorId);
}

export async function introduceActorToCastAction(castId: string, actorId: string) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ACTOR_ID_RE.test(castId) || !ACTOR_ID_RE.test(actorId)) return;
  const { error } = await supabase.from("cast_introductions").upsert(
    { cast_id: castId, actor_id: actorId, created_by: user.id },
    { onConflict: "cast_id,actor_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  revalidatePath(`/casts/${castId}`);
  revalidatePath(`/actors/${actorId}`);
}

export async function removeCastIntroductionAction(castId: string, actorId: string) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const { error } = await supabase
    .from("cast_introductions")
    .delete()
    .eq("cast_id", castId)
    .eq("actor_id", actorId);
  if (error) throw error;
  revalidatePath(`/casts/${castId}`);
  revalidatePath(`/actors/${actorId}`);
}

export async function optionActorForCastFormAction(formData: FormData) {
  const castId = String(formData.get("cast_id") ?? "");
  const actorId = String(formData.get("actor_id") ?? "");
  await optionActorForCastAction(castId, actorId);
}

export async function optionActorForCastAction(castId: string, actorId: string) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ACTOR_ID_RE.test(castId) || !ACTOR_ID_RE.test(actorId)) return;

  const { data: existing } = await supabase
    .from("cast_options")
    .select("id, status")
    .eq("cast_id", castId)
    .eq("actor_id", actorId)
    .maybeSingle();

  if (existing?.status === "pending") {
    const { data: pendingCast } = await supabase
      .from("cast_listings")
      .select("id, project_name, role_name")
      .eq("id", castId)
      .maybeSingle();
    if (pendingCast) {
      try {
        await notifyOptionedActor(pendingCast, actorId);
      } catch (err) {
        console.error("option notify failed", err);
      }
    }
    revalidatePath(`/casts/${castId}`);
    revalidatePath(`/actors/${actorId}`);
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("cast_options")
      .update({ status: "pending", responded_at: null, created_by: user.id })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("cast_options").insert({
      cast_id: castId,
      actor_id: actorId,
      created_by: user.id,
      status: "pending",
    });
    if (error) throw error;
  }

  const { data: cast } = await supabase
    .from("cast_listings")
    .select("id, project_name, role_name")
    .eq("id", castId)
    .maybeSingle();
  if (cast) {
    try {
      await notifyOptionedActor(cast, actorId);
    } catch (err) {
      console.error("option notify failed", err);
    }
  }

  revalidatePath(`/casts/${castId}`);
  revalidatePath(`/actors/${actorId}`);
}

export async function removeCastOptionAction(castId: string, actorId: string) {
  await requireAdminPerm("casts");
  const supabase = await createClient();
  const { error } = await supabase
    .from("cast_options")
    .delete()
    .eq("cast_id", castId)
    .eq("actor_id", actorId);
  if (error) throw error;
  revalidatePath(`/casts/${castId}`);
  revalidatePath(`/actors/${actorId}`);
}

export async function sendMessageAction(conversationId: string, body: string) {
  await requireAdminPerm("messages");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !body.trim()) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: body.trim(),
  });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function startConversationAction(actorId: string) {
  await requireAdminPerm("messages");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("actor_id", actorId)
    .maybeSingle();
  if (existing?.id) redirect(`/messages/${existing.id}`);
  const { data, error } = await supabase
    .from("conversations")
    .insert({ actor_id: actorId })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/messages/${data.id}`);
}

export async function upsertAnnouncementAction(formData: FormData) {
  await requireAdminPerm("announcements");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const title_tr = String(formData.get("title_tr") ?? "").trim();
  const body_tr = String(formData.get("body_tr") ?? "").trim();
  const title_en = String(formData.get("title_en") ?? "").trim() || title_tr;
  const body_en = String(formData.get("body_en") ?? "").trim() || body_tr;
  if (!title_tr || !body_tr) throw new Error("TR başlık ve metin zorunlu.");

  if (id) {
    const { error } = await supabase
      .from("announcements")
      .update({ title_tr, title_en, body_tr, body_en })
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("announcements").insert({
      title_tr,
      title_en,
      body_tr,
      body_en,
      created_by: user.id,
    });
    if (error) throw error;
  }
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function deleteAnnouncementAction(id: string) {
  await requireAdminPerm("announcements");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/announcements");
}

const ACTOR_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shareExpiry(ttl: string) {
  if (ttl === "7d") return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (ttl === "forever") return null;
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function uniqueActorIds(values: FormDataEntryValue[]) {
  const ids = values
    .map((value) => String(value).trim())
    .filter((id) => ACTOR_ID_RE.test(id));
  return [...new Set(ids)].slice(0, 40);
}

function uniqueApplicationIds(values: FormDataEntryValue[]) {
  return uniqueActorIds(values);
}

export async function createActorShareAction(formData: FormData) {
  await requireAdminPerm("actors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const actorIds = uniqueActorIds([
    ...formData.getAll("actor_ids"),
    formData.get("actor_id") ?? "",
  ]);
  const actorId = actorIds[0] ?? "";
  const recipientId = String(formData.get("recipient_id") ?? "").trim() || null;
  const pin = String(formData.get("pin") ?? "").trim();
  const ttl = String(formData.get("ttl") ?? "1d");
  if (!actorId) redirect("/actors?share=pick");
  if (!isSharePin(pin)) {
    redirect(actorIds.length > 1 ? "/actors?share=pin" : `/actors/${actorId}?share=pin`);
  }

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error } = await supabase.from("actor_shares").insert({
    actor_id: actorId,
    actor_ids: actorIds,
    token,
    created_by: user.id,
    recipient_id: recipientId,
    pin_hash: hashSharePin(pin),
    note: pin,
    expires_at: shareExpiry(ttl),
  });
  if (error) throw error;
  revalidatePath("/actors");
  revalidatePath(`/actors/${actorId}`);
  revalidatePath("/directors");
  if (formData.getAll("actor_ids").length) {
    redirect(`/actors?shared=${token}`);
  }
}

export async function unlockActorShareAction(formData: FormData) {
  const parsed = parseShareInput(String(formData.get("token") ?? ""));
  const token = parsed.token;
  const pin = String(formData.get("pin") ?? "").replace(/\D/g, "").slice(0, 4);
  if (!token) redirect("/p/missing");

  const actor = await fetchSharedActor(token, pin);
  const application =
    actor.status === "unavailable" ? await fetchSharedApplication(token, pin) : actor;
  const opened = actor.status !== "unavailable" ? actor : application;

  if (opened.status === "ok" && isSharePin(pin)) {
    const store = await cookies();
    store.set(shareUnlockCookieName(token), pin, {
      httpOnly: true,
      sameSite: "lax",
      path: `/p/${token}`,
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    redirect(`/p/${token}`);
  }

  const reason = opened.status === "bad_pin" || opened.status === "pin_required" ? "pin" : "expired";
  redirect(`/p/${token}?e=${reason}`);
}

export async function createApplicationShareAction(formData: FormData) {
  await requireAdminPerm("applications");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const applicationIds = uniqueApplicationIds([
    ...formData.getAll("application_ids"),
    formData.get("application_id") ?? "",
  ]);
  const applicationId = applicationIds[0] ?? "";
  const recipientId = String(formData.get("recipient_id") ?? "").trim() || null;
  const pin = String(formData.get("pin") ?? "").trim();
  const ttl = String(formData.get("ttl") ?? "1d");
  if (!applicationId) redirect("/applications?share=pick");
  if (!isSharePin(pin)) {
    redirect(
      applicationIds.length > 1
        ? "/applications?share=pin"
        : `/applications/${applicationId}?share=pin`
    );
  }

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error } = await supabase.from("application_shares").insert({
    application_id: applicationId,
    application_ids: applicationIds,
    token,
    created_by: user.id,
    recipient_id: recipientId,
    pin_hash: hashSharePin(pin),
    note: pin,
    expires_at: shareExpiry(ttl),
  });
  if (error) throw error;
  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  if (formData.getAll("application_ids").length) {
    redirect(`/applications?shared=${token}`);
  }
}

export async function revokeApplicationShareAction(formData: FormData) {
  await requireAdminPerm("applications");
  const supabase = await createClient();
  const id = String(formData.get("share_id") ?? "");
  const applicationId = String(formData.get("application_id") ?? "");
  const { error } = await supabase
    .from("application_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/applications");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function revokeActorShareAction(formData: FormData) {
  await requireAdminPerm("actors");
  const supabase = await createClient();
  const id = String(formData.get("share_id") ?? "");
  const actorId = String(formData.get("actor_id") ?? "");
  const { error } = await supabase
    .from("actor_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/actors");
  revalidatePath(`/actors/${actorId}`);
  revalidatePath("/directors");
}

export async function setDirectorRoleAction(formData: FormData) {
  await requireAdminPerm("directors");
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect(`/directors?error=${encodeURIComponent("E-posta gerekli.")}`);
  }

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();
  if (findError) {
    redirect(`/directors?error=${encodeURIComponent("Kullanıcı aranırken bir hata oluştu.")}`);
  }
  if (!profile) {
    redirect(
      `/directors?error=${encodeURIComponent(
        "Bu e-posta ile kayıtlı kullanıcı yok. Önce uygulamadan üye olsun.",
      )}`,
    );
  }
  if (profile.role === "admin") {
    redirect(`/directors?error=${encodeURIComponent("Admin rolü değiştirilemez.")}`);
  }
  if (profile.role === "cast_director") {
    redirect("/directors?ok=" + encodeURIComponent("Bu kişi zaten cast direktörü."));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "cast_director" })
    .eq("id", profile.id);
  if (error) {
    redirect(`/directors?error=${encodeURIComponent("Rol verilemedi.")}`);
  }
  revalidatePath("/directors");
  redirect("/directors?ok=" + encodeURIComponent("Cast direktörü rolü verildi."));
}

export async function removeDirectorRoleAction(formData: FormData) {
  await requireAdminPerm("directors");
  const supabase = await createClient();
  const id = String(formData.get("user_id") ?? "");
  const { error } = await supabase.from("profiles").update({ role: "actor" }).eq("id", id);
  if (error) {
    redirect(`/directors?error=${encodeURIComponent("Rol alınamadı.")}`);
  }
  revalidatePath("/directors");
  redirect("/directors?ok=" + encodeURIComponent("Direktör rolü alındı."));
}

function parseAdminPerms(formData: FormData) {
  const full = formData.get("full") === "on";
  const perms = formData
    .getAll("perm")
    .map((value) => String(value))
    .filter((value): value is AdminPerm => (ADMIN_PERMS as readonly string[]).includes(value));
  return { full, perms };
}

export async function setAdminRoleAction(formData: FormData) {
  await requireAdminPerm("admins");
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const { full, perms } = parseAdminPerms(formData);
  const parsed = parseNewPassword(formData, false);

  if (!email) {
    redirect(`/admins?error=${encodeURIComponent("E-posta gerekli.")}`);
  }
  if (parsed.error) {
    redirect(`/admins?error=${encodeURIComponent(parsed.error)}`);
  }
  if (!full && perms.length === 0) {
    redirect(`/admins?error=${encodeURIComponent("En az bir yetki seç veya tam yetki ver.")}`);
  }

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();
  if (findError) {
    redirect(`/admins?error=${encodeURIComponent("Kullanıcı aranırken bir hata oluştu.")}`);
  }

  let userId = profile?.id;
  if (!userId) {
    if (!parsed.password) {
      redirect(
        `/admins?error=${encodeURIComponent(
          "Bu e-posta kayıtlı değil. Yeni yönetici için şifre yaz.",
        )}`,
      );
    }
    const created = await createAuthUser(email, parsed.password, fullName);
    if (created.error || !created.userId) {
      redirect(`/admins?error=${encodeURIComponent(created.error || "Kullanıcı oluşturulamadı.")}`);
    }
    userId = created.userId;
  } else if (profile?.role === "admin") {
    redirect(`/admins?error=${encodeURIComponent("Bu kişi zaten yönetici.")}`);
  } else if (parsed.password) {
    const {
      data: { user: actor },
    } = await supabase.auth.getUser();
    if (actor?.id === userId) {
      const { error: ownError } = await supabase.auth.updateUser({ password: parsed.password });
      if (ownError) {
        redirect(`/admins?error=${encodeURIComponent(ownError.message)}`);
      }
    } else {
      const updated = await setAuthPassword(userId, parsed.password);
      if (updated.error) {
        redirect(`/admins?error=${encodeURIComponent(updated.error)}`);
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: "admin",
      is_super_admin: full,
      admin_permissions: full ? [] : perms,
      ...(fullName ? { full_name: fullName } : {}),
    })
    .eq("id", userId);
  if (error) {
    redirect(`/admins?error=${encodeURIComponent("Yetki verilemedi.")}`);
  }
  revalidatePath("/admins");
  redirect("/admins?ok=" + encodeURIComponent("Yönetici yetkisi verildi."));
}

export async function setAdminPasswordAction(formData: FormData) {
  const { supabase, user } = await requireAdminPerm("admins");
  const id = String(formData.get("user_id") ?? "");
  const parsed = parseNewPassword(formData, true);
  if (!id) redirect(`/admins?error=${encodeURIComponent("Yönetici seçilmedi.")}`);
  if (parsed.error) {
    redirect(`/admins?error=${encodeURIComponent(parsed.error)}`);
  }

  if (user?.id === id) {
    const { error } = await supabase.auth.updateUser({ password: parsed.password });
    if (error) redirect(`/admins?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/admins");
    redirect("/admins?ok=" + encodeURIComponent("Şifre kaydedildi."));
  }

  const updated = await setAuthPassword(id, parsed.password);
  if (updated.error) {
    redirect(`/admins?error=${encodeURIComponent(updated.error)}`);
  }
  if (updated.missingServiceRole) {
    const { data: target } = await supabase.from("profiles").select("email").eq("id", id).maybeSingle();
    if (!target?.email) {
      redirect(`/admins?error=${encodeURIComponent("Bu yöneticinin e-postası yok.")}`);
    }
    const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/login/update-password`,
    });
    if (error) redirect(`/admins?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/admins");
    redirect(
      "/admins?ok=" +
        encodeURIComponent("Şifre maili gönderildi. Kendi şifren için soldaki Şifre sayfasını kullan."),
    );
  }
  revalidatePath("/admins");
  redirect("/admins?ok=" + encodeURIComponent("Şifre kaydedildi."));
}

export async function updateAdminPermsAction(formData: FormData) {
  await requireAdminPerm("admins");
  const supabase = await createClient();
  const id = String(formData.get("user_id") ?? "");
  const { full, perms } = parseAdminPerms(formData);
  if (!id) redirect(`/admins?error=${encodeURIComponent("Yönetici seçilmedi.")}`);
  if (!full && perms.length === 0) {
    redirect(`/admins?error=${encodeURIComponent("En az bir yetki seç veya tam yetki ver.")}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_super_admin: full,
      admin_permissions: full ? [] : perms,
    })
    .eq("id", id)
    .eq("role", "admin");
  if (error) {
    redirect(`/admins?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admins");
  redirect("/admins?ok=" + encodeURIComponent("Yetkiler kaydedildi."));
}

export async function removeAdminRoleAction(formData: FormData) {
  await requireAdminPerm("admins");
  const supabase = await createClient();
  const id = String(formData.get("user_id") ?? "");
  const { error } = await supabase
    .from("profiles")
    .update({
      role: "actor",
      is_super_admin: false,
      admin_permissions: [],
    })
    .eq("id", id);
  if (error) {
    redirect(`/admins?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admins");
  redirect("/admins?ok=" + encodeURIComponent("Yönetici yetkisi alındı."));
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

function dateOrNull(v: FormDataEntryValue | null) {
  const raw = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  if (year < 1900 || year > 2100) return null;
  return raw;
}

async function uploadCastLogo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
) {
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Logo en fazla 4 MB olabilir.");
  }
  const type = file.type || "image/jpeg";
  if (!type.startsWith("image/")) {
    throw new Error("Logo için bir görsel seç.");
  }
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/cast-logos/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from("covers").upload(path, bytes, {
    contentType: type,
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}
