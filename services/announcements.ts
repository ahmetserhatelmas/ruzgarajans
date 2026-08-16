import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/database';

export type AnnouncementInput = {
  title_tr: string;
  title_en: string;
  body_tr: string;
  body_en: string;
};

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(
  input: AnnouncementInput,
  createdBy: string
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...input, created_by: createdBy })
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
