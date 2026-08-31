import { supabase } from '@/lib/supabase';
import type { Application, CastListing, CastOption, CastOptionStatus } from '@/types/database';

export async function fetchPublishedCasts(): Promise<CastListing[]> {
  const { data, error } = await supabase
    .from('cast_listings')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CastListing[];
}

export async function fetchCastById(id: string): Promise<CastListing | null> {
  const { data, error } = await supabase
    .from('cast_listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as CastListing | null;
}

export async function fetchMyApplications(actorId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Application[];
}

export async function fetchMyIntroducedCastIds(actorId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cast_introductions')
    .select('cast_id')
    .eq('actor_id', actorId);
  if (error) throw error;
  return ((data ?? []) as { cast_id: string }[]).map((row) => row.cast_id);
}

export async function fetchIntroductionForCast(
  castId: string,
  actorId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('cast_introductions')
    .select('id')
    .eq('cast_id', castId)
    .eq('actor_id', actorId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function fetchMyCastOptions(
  actorId: string
): Promise<{ cast_id: string; status: CastOptionStatus }[]> {
  const { data, error } = await supabase
    .from('cast_options')
    .select('cast_id, status')
    .eq('actor_id', actorId);
  if (error) throw error;
  return (data ?? []) as { cast_id: string; status: CastOptionStatus }[];
}

export async function fetchOptionForCast(
  castId: string,
  actorId: string
): Promise<CastOption | null> {
  const { data, error } = await supabase
    .from('cast_options')
    .select('*')
    .eq('cast_id', castId)
    .eq('actor_id', actorId)
    .maybeSingle();
  if (error) throw error;
  return (data as CastOption | null) ?? null;
}

export async function respondToCastOption(
  castId: string,
  actorId: string,
  status: 'accepted' | 'declined'
): Promise<CastOption> {
  const { data, error } = await supabase
    .from('cast_options')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('cast_id', castId)
    .eq('actor_id', actorId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('option_already_answered');
  return data as CastOption;
}

export async function applyToCast(input: {
  castId: string;
  actorId: string;
  acceptBudget: boolean;
  counterBudget?: number | null;
  note?: string;
}): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .upsert(
      {
        cast_id: input.castId,
        actor_id: input.actorId,
        accept_budget: input.acceptBudget,
        counter_budget: input.acceptBudget ? null : input.counterBudget ?? null,
        note: input.note ?? null,
        status: 'submitted',
      },
      { onConflict: 'cast_id,actor_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as Application;
}

export async function fetchAllCastsAdmin(): Promise<CastListing[]> {
  const { data, error } = await supabase
    .from('cast_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CastListing[];
}

export async function createCast(
  payload: Partial<CastListing> & {
    project_name: string;
    role_name: string;
    role_description: string;
    created_by: string;
  }
): Promise<CastListing> {
  const { data, error } = await supabase
    .from('cast_listings')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as CastListing;
}

export async function setCastPublished(id: string, isPublished: boolean) {
  const { error } = await supabase
    .from('cast_listings')
    .update({ is_published: isPublished })
    .eq('id', id);
  if (error) throw error;
}

export async function updateCast(
  id: string,
  payload: Partial<
    Pick<
      CastListing,
      | 'project_name'
      | 'role_name'
      | 'role_description'
      | 'age_min'
      | 'age_max'
      | 'gender'
      | 'height_min_cm'
      | 'height_max_cm'
      | 'nationalities'
      | 'languages'
      | 'shoot_date'
      | 'shoot_location'
      | 'deadline'
      | 'option_date'
      | 'payment_due_date'
      | 'budget_amount'
      | 'budget_currency'
      | 'allow_budget_counter'
      | 'requires_video'
      | 'is_published'
      | 'dialogue_mode'
      | 'dialogue_script'
      | 'dialogue_audio_url'
    >
  >
): Promise<CastListing> {
  const { data, error } = await supabase
    .from('cast_listings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as CastListing;
}
