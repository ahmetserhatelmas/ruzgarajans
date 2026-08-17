export type UserRole = 'actor' | 'admin';
export type ActorStatus = 'pending' | 'approved' | 'rejected';
export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'audition_invited'
  | 'accepted'
  | 'rejected';
export type GenderPref = 'female' | 'male' | 'any' | 'non_binary';
export type VideoKind = 'intro' | 'showreel' | 'audition' | 'promo' | 'mimic' | 'talent';
export type DialogueMode = 'none' | 'script_tts' | 'audio_file';
export type NotificationType =
  | 'new_cast'
  | 'application_result'
  | 'audition_invite'
  | 'new_message'
  | 'announcement';

export type Profile = {
  id: string;
  role: UserRole;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  locale: string;
  avatar_url: string | null;
  cover_url: string | null;
  actor_status: ActorStatus;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ActorProfile = {
  user_id: string;
  bio: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  hair_color: string | null;
  eye_color: string | null;
  shoe_size: string | null;
  body_size: string | null;
  education: string | null;
  experience: string | null;
  languages: string[] | null;
  skills: string[] | null;
  gender: string | null;
  city: string | null;
  intro_video_id: string | null;
  intro_video_playback_url: string | null;
  showreel_video_id: string | null;
  showreel_playback_url: string | null;
  mimic_video_id: string | null;
  mimic_video_playback_url: string | null;
  talent_video_id: string | null;
  talent_video_playback_url: string | null;
  national_id: string | null;
  nationality: string | null;
  birth_place: string | null;
  whatsapp: string | null;
  relative_phone: string | null;
  address: string | null;
  registration_date: string | null;
  profession: string | null;
  instagram: string | null;
  tshirt_size: string | null;
  pants_size: string | null;
  suit_size: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  iban: string | null;
  has_passport: boolean | null;
  passport_no: string | null;
  passport_type: string | null;
  visa_countries: string | null;
  has_work_permit: boolean | null;
  has_residence_permit: boolean | null;
  employment_status: string[] | null;
  sports: string[] | null;
  dances: string[] | null;
  model_skills: string[] | null;
  performance_skills: string[] | null;
  special_conditions: string[] | null;
  dances_other: string | null;
  model_other: string | null;
  performance_other: string | null;
  accents: string | null;
  instruments: string | null;
  additional_notes: string | null;
  acting_education: string | null;
  driving_info: string | null;
  availability: string | null;
  other_agency: string | null;
  referral_source: string | null;
  special_interests: string | null;
  kvkk_accepted: boolean;
  form_saved_at: string | null;
  media_saved_at: string | null;
  registration_completed_at: string | null;
  updated_at: string;
};

export type CastListing = {
  id: string;
  created_by: string;
  project_name: string;
  role_name: string;
  role_description: string;
  age_min: number | null;
  age_max: number | null;
  gender: GenderPref;
  height_min_cm: number | null;
  height_max_cm: number | null;
  nationalities: string[];
  languages: string[];
  shoot_date: string | null;
  shoot_location: string | null;
  deadline: string | null;
  budget_amount: number | null;
  budget_currency: string;
  allow_budget_counter: boolean;
  is_published: boolean;
  dialogue_mode: DialogueMode;
  dialogue_script: string | null;
  dialogue_audio_url: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  cast_id: string;
  actor_id: string;
  status: ApplicationStatus;
  accept_budget: boolean;
  counter_budget: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Video = {
  id: string;
  user_id: string;
  cast_id: string | null;
  application_id: string | null;
  kind: VideoKind;
  cf_uid: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  status: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title_tr: string;
  title_en: string;
  body_tr: string;
  body_en: string;
  created_by: string;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};
