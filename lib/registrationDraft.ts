import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeLanguageSkills, type LanguageSkill } from '@/constants/languages';
import { serializeDrivingLicenses } from '@/constants/licenses';
import { updateActorProfile, updateProfileBasics } from '@/services/actors';

export type RegistrationDraft = {
  fullName: string;
  isTurkishCitizen: boolean | null;
  nationalId: string;
  nationality: string;
  birthDate: string;
  birthPlace: string;
  phone: string;
  relativePhone: string;
  whatsapp: string;
  address: string;
  registrationDate: string;
  gender: string;
  education: string;
  profession: string;
  instagram: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  tshirt: string;
  pants: string;
  suit: string;
  shoe: string;
  sports: string[];
  dances: string[];
  dancesOther: string;
  modelSkills: string[];
  modelOther: string;
  performance: string[];
  performanceOther: string;
  accents: string;
  instruments: string;
  special: string[];
  additionalNotes: string;
  languages: LanguageSkill[];
  hasActingEducation: boolean | null;
  actingEducationDetail: string;
  hasDriving: boolean | null;
  drivingLicenses: string[];
  drivingDetail?: string;
  experience: string;
  availability: string;
  hasOtherAgency: boolean | null;
  otherAgencyDetail: string;
  referral: string;
  specialInterests: string;
  bankAccountName: string;
  bankName: string;
  iban: string;
  hasPassport: boolean | null;
  passportNo: string;
  passportType: string;
  visaCountries: string;
  hasWorkPermit: boolean | null;
  hasResidencePermit: boolean | null;
  insuranceStatus: string;
  insuranceOther: string;
  kvkk: boolean;
};

function draftKey(userId: string) {
  return `reg-form-draft:${userId}`;
}

function numOrNull(value: string) {
  const n = Number(value);
  return value && !Number.isNaN(n) ? n : null;
}

function yesNo(yes: boolean | null, detail: string): string | null {
  if (yes === null) return null;
  if (!yes) return 'Hayır';
  return detail.trim() || null;
}

export async function loadRegistrationDraft(userId: string): Promise<RegistrationDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as RegistrationDraft;
  } catch {
    return null;
  }
}

export async function saveRegistrationDraft(userId: string, draft: RegistrationDraft) {
  await AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft));
}

export async function clearRegistrationDraft(userId: string) {
  await AsyncStorage.removeItem(draftKey(userId));
}

export async function persistRegistrationDraftRemote(userId: string, draft: RegistrationDraft) {
  const basics: { full_name?: string; phone?: string } = {};
  if (draft.fullName.trim()) basics.full_name = draft.fullName.trim();
  if (draft.phone.trim()) basics.phone = draft.phone.trim();
  if (Object.keys(basics).length) {
    await updateProfileBasics(userId, basics);
  }

  await updateActorProfile(userId, {
    is_turkish_citizen: draft.isTurkishCitizen,
    national_id: draft.isTurkishCitizen === true ? draft.nationalId.trim() || null : null,
    nationality: draft.nationality || null,
    birth_date: draft.birthDate.trim() || null,
    birth_place: draft.birthPlace.trim() || null,
    whatsapp: draft.whatsapp.trim() || null,
    relative_phone: draft.relativePhone.trim() || null,
    address: draft.address.trim() || null,
    registration_date: draft.registrationDate || null,
    gender: draft.gender || null,
    education: draft.education || null,
    profession: draft.profession || null,
    instagram: draft.instagram.trim() || null,
    height_cm: numOrNull(draft.height),
    weight_kg: numOrNull(draft.weight),
    hair_color: draft.hair.trim() || null,
    eye_color: draft.eyes.trim() || null,
    tshirt_size: draft.tshirt.trim() || null,
    pants_size: draft.pants.trim() || null,
    suit_size: draft.suit.trim() || null,
    shoe_size: draft.shoe.trim() || null,
    body_size: [draft.tshirt, draft.pants, draft.suit].filter(Boolean).join(' / ') || null,
    sports: draft.sports,
    dances: draft.dances,
    dances_other: draft.dancesOther.trim() || null,
    model_skills: draft.modelSkills,
    model_other: draft.modelOther.trim() || null,
    performance_skills: draft.performance,
    performance_other: draft.performanceOther.trim() || null,
    accents: draft.accents.trim() || null,
    instruments: draft.instruments.trim() || null,
    special_conditions: draft.special,
    additional_notes: draft.additionalNotes.trim() || null,
    languages: serializeLanguageSkills(draft.languages),
    acting_education: yesNo(draft.hasActingEducation, draft.actingEducationDetail),
    driving_info: serializeDrivingLicenses(
      draft.hasDriving,
      draft.drivingLicenses ?? [],
      'Hayır'
    ),
    experience: draft.experience.trim() || null,
    availability: draft.availability.trim() || null,
    other_agency: yesNo(draft.hasOtherAgency, draft.otherAgencyDetail),
    referral_source: draft.referral.trim() || null,
    special_interests: draft.specialInterests.trim() || null,
    bank_account_name: draft.bankAccountName.trim() || null,
    bank_name: draft.bankName.trim() || null,
    iban: draft.iban.trim() || null,
    has_passport: draft.hasPassport,
    passport_no: draft.hasPassport === true ? draft.passportNo.trim() || null : null,
    passport_type: draft.hasPassport === true ? draft.passportType.trim() || null : null,
    visa_countries: draft.visaCountries.trim() || null,
    has_work_permit: draft.hasWorkPermit,
    has_residence_permit: draft.hasResidencePermit,
    insurance_status: draft.insuranceStatus || null,
    insurance_other:
      draft.insuranceStatus === 'ineligible_other'
        ? draft.insuranceOther.trim() || null
        : null,
    kvkk_accepted: draft.kvkk,
  });
}
