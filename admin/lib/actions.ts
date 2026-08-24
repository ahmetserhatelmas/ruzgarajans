"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyMatchingActors } from "@/lib/notify-cast";
import { attachDialogueAudio } from "@/lib/dialogue-audio";
import { parseDialogueScript } from "@/lib/dialogue-script";
import { ADMIN_PERMS, requireAdminPerm, type AdminPerm } from "@/lib/permissions";
import { fetchSharedActor } from "@/lib/share";
import { hashSharePin, isSharePin, shareUnlockCookieName } from "@/lib/share-pin";
import type { ActorStatus, ApplicationStatus, CastListing, GenderPref } from "@/lib/types";
import { cookies } from "next/headers";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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

export async function setActorStatusAction(id: string, status: ActorStatus) {
  await requireAdminPerm("actors");
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

export async function deleteApplicationAction(id: string) {
  await requireAdminPerm("applications");
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/applications");
  redirect("/applications");
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
    dialogue_script: emptyToNull(formData.get("dialogue_script")),
    dialogue_mode: String(formData.get("dialogue_script") ?? "").trim()
      ? "script_tts"
      : "none",
  };

  if (!payload.project_name || !payload.role_name || !payload.role_description) {
    throw new Error("Proje, rol ve açıklama zorunlu.");
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

export async function createActorShareAction(formData: FormData) {
  await requireAdminPerm("actors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const actorId = String(formData.get("actor_id") ?? "").trim();
  const recipientId = String(formData.get("recipient_id") ?? "").trim() || null;
  const pin = String(formData.get("pin") ?? "").trim();
  const ttl = String(formData.get("ttl") ?? "1d");
  if (!actorId) redirect("/actors");
  if (!isSharePin(pin)) {
    redirect(`/actors/${actorId}?share=pin`);
  }

  const expiresAt =
    ttl === "7d"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : ttl === "forever"
        ? null
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error } = await supabase.from("actor_shares").insert({
    actor_id: actorId,
    token,
    created_by: user.id,
    recipient_id: recipientId,
    pin_hash: hashSharePin(pin),
    expires_at: expiresAt,
  });
  if (error) throw error;
  revalidatePath(`/actors/${actorId}`);
  revalidatePath("/directors");
}

export async function unlockActorShareAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!token) redirect("/p/missing");

  const opened = await fetchSharedActor(token, pin);
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
  const { full, perms } = parseAdminPerms(formData);

  if (!email) {
    redirect(`/admins?error=${encodeURIComponent("E-posta gerekli.")}`);
  }

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();
  if (findError) {
    redirect(`/admins?error=${encodeURIComponent("Kullanıcı aranırken bir hata oluştu.")}`);
  }
  if (!profile) {
    redirect(
      `/admins?error=${encodeURIComponent(
        "Bu e-posta ile kayıtlı kullanıcı yok. Önce uygulamadan üye olsun.",
      )}`,
    );
  }
  if (profile.role === "admin") {
    redirect(`/admins?error=${encodeURIComponent("Bu kişi zaten yönetici.")}`);
  }
  if (!full && perms.length === 0) {
    redirect(`/admins?error=${encodeURIComponent("En az bir yetki seç veya tam yetki ver.")}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: "admin",
      is_super_admin: full,
      admin_permissions: full ? [] : perms,
    })
    .eq("id", profile.id);
  if (error) {
    redirect(`/admins?error=${encodeURIComponent("Yetki verilemedi.")}`);
  }
  revalidatePath("/admins");
  redirect("/admins?ok=" + encodeURIComponent("Yönetici yetkisi verildi."));
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
