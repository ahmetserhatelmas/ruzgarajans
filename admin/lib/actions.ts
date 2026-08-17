"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyMatchingActors } from "@/lib/notify-cast";
import type { ActorStatus, ApplicationStatus, CastListing, GenderPref } from "@/lib/types";

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
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/casts");
}

export async function deleteApplicationAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/applications");
  redirect("/applications");
}

export async function upsertCastAction(formData: FormData) {
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
    shoot_date: emptyToNull(formData.get("shoot_date")),
    deadline: emptyToNull(formData.get("deadline")),
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
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/announcements");
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
