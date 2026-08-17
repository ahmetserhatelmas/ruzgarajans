import { supabase } from '@/lib/supabase';
import type { Application, CastListing } from '@/types/database';

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
      | 'budget_amount'
      | 'budget_currency'
      | 'allow_budget_counter'
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
