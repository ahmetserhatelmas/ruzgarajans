/** Option IDs for the agency registration form (TR/EN labels via i18n). */

export const SPORTS = [
  'action',
  'horse_riding',
  'weapons',
  'scuba',
  'cycling',
  'skateboard',
  'skating',
  'archery',
  'fencing',
  'sword',
  'yoga',
  'fitness',
  'boxing',
  'football',
  'volleyball',
  'basketball',
  'swimming',
  'athletics',
  'gymnastics',
  'pilates',
  'karate',
  'kickboxing',
  'judo',
  'taekwondo',
  'parkour',
  'stunt',
  'none',
] as const;

export const DANCES = [
  'latin',
  'tango',
  'belly',
  'hiphop',
  'ballet',
  'modern',
  'folklore',
  'other',
  'none',
] as const;

export const MODEL_SKILLS = [
  'hand',
  'foot',
  'photo',
  'fashion',
  'other',
] as const;

export const PERFORMANCE_SKILLS = [
  'presenter',
  'dubbing',
  'pantomime',
  'imitation',
  'improv',
  'fire',
  'stilts',
  'pole',
  'circus',
  'juggler',
  'clown',
] as const;

export const SPECIAL_CONDITIONS = [
  'twin',
  'triplet',
  'quadruplet',
  'prosthetic_leg',
  'down_syndrome',
  'physical_condition',
  'large_scar',
  'dwarfism',
  'albino',
  'vitiligo',
] as const;

export const INSURANCE_STATUSES = [
  'eligible',
  'eligible_sgk',
  'eligible_retired',
  'unemployment',
  'student_grant',
  'ineligible_other',
] as const;

export const GENDERS = ['female', 'male'] as const;

/** Physical attributes — fixed ids for cast matching */
export const HEIGHT_CM = Array.from({ length: 71 }, (_, i) => String(140 + i)); // 140–210
export const WEIGHT_KG = Array.from({ length: 111 }, (_, i) => String(40 + i)); // 40–150

export const HAIR_COLORS = [
  'black',
  'dark_brown',
  'brown',
  'light_brown',
  'blonde',
  'dark_blonde',
  'red',
  'auburn',
  'gray',
  'white',
  'other',
] as const;

export const EYE_COLORS = [
  'brown',
  'dark_brown',
  'hazel',
  'green',
  'blue',
  'gray',
  'black',
  'other',
] as const;

export const CLOTHING_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export const PANTS_SIZES = [
  '34',
  '36',
  '38',
  '40',
  '42',
  '44',
  '46',
  '48',
  '50',
  '52',
  '54',
  '56',
] as const;

export const SUIT_SIZES = [
  '44',
  '46',
  '48',
  '50',
  '52',
  '54',
  '56',
  '58',
  '60',
  '62',
] as const;

export const SHOE_SIZES = Array.from({ length: 16 }, (_, i) => String(35 + i)); // 35–50

export const PASSPORT_TYPES = [
  'ordinary',
  'special',
  'service',
  'diplomatic',
  'foreign',
] as const;

export const EDUCATION_LEVELS = [
  'primary',
  'middle',
  'high_school',
  'associate',
  'bachelor',
  'master',
  'doctorate',
  'other',
] as const;

export const PROFESSIONS = [
  'actor',
  'model',
  'student',
  'teacher',
  'engineer',
  'doctor',
  'nurse',
  'lawyer',
  'architect',
  'designer',
  'musician',
  'dancer',
  'athlete',
  'freelancer',
  'private_sector',
  'public_sector',
  'homemaker',
  'unemployed',
  'retired',
  'other',
] as const;

export type SportId = (typeof SPORTS)[number];
export type DanceId = (typeof DANCES)[number];
export type ModelSkillId = (typeof MODEL_SKILLS)[number];
export type PerformanceSkillId = (typeof PERFORMANCE_SKILLS)[number];
export type SpecialConditionId = (typeof SPECIAL_CONDITIONS)[number];
export type HairColorId = (typeof HAIR_COLORS)[number];
export type EyeColorId = (typeof EYE_COLORS)[number];
export type EducationLevelId = (typeof EDUCATION_LEVELS)[number];
export type ProfessionId = (typeof PROFESSIONS)[number];
export type PassportTypeId = (typeof PASSPORT_TYPES)[number];
export type InsuranceStatusId = (typeof INSURANCE_STATUSES)[number];
