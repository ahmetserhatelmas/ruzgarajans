import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { ValueSlider } from '@/components/ui/ValueSlider';
import { useAuth } from '@/contexts/AuthContext';
import { updateActorProfile, updateProfileBasics } from '@/services/actors';
import {
  CLOTHING_SIZES,
  DANCES,
  EDUCATION_LEVELS,
  EYE_COLORS,
  GENDERS,
  HAIR_COLORS,
  MODEL_SKILLS,
  PERFORMANCE_SKILLS,
  PROFESSIONS,
  SPECIAL_CONDITIONS,
  SPORTS,
} from '@/constants/registrationForm';
import { SelectField } from '@/components/ui/SelectField';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function reqLabel(label: string) {
  return `${label} *`;
}

const NO_MARKERS = /^(hayır|hayir|no|yok)$/i;

function parseYesNoDetail(raw: string | null | undefined): {
  yes: boolean | null;
  detail: string;
} {
  if (!raw?.trim()) return { yes: null, detail: '' };
  const v = raw.trim();
  if (NO_MARKERS.test(v)) return { yes: false, detail: '' };
  return { yes: true, detail: v };
}

function serializeYesNoDetail(
  yes: boolean | null,
  detail: string,
  noLabel: string
): string | null {
  if (yes === null) return null;
  if (!yes) return noLabel;
  const trimmed = detail.trim();
  return trimmed || null;
}

export default function RegistrationFormScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, actorProfile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nationalId, setNationalId] = useState(actorProfile?.national_id ?? '');
  const [birthDate, setBirthDate] = useState(actorProfile?.birth_date ?? '');
  const [birthPlace, setBirthPlace] = useState(actorProfile?.birth_place ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(actorProfile?.whatsapp ?? '');
  const [address, setAddress] = useState(actorProfile?.address ?? '');
  const [registrationDate] = useState(actorProfile?.registration_date ?? todayISO());
  const [gender, setGender] = useState(actorProfile?.gender ?? '');
  const [education, setEducation] = useState(actorProfile?.education ?? '');
  const [profession, setProfession] = useState(actorProfile?.profession ?? '');
  const [instagram, setInstagram] = useState(actorProfile?.instagram ?? '');

  const [height, setHeight] = useState(actorProfile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(actorProfile?.weight_kg?.toString() ?? '');
  const [hair, setHair] = useState(actorProfile?.hair_color ?? '');
  const [eyes, setEyes] = useState(actorProfile?.eye_color ?? '');
  const [tshirt, setTshirt] = useState(actorProfile?.tshirt_size ?? '');
  const [pants, setPants] = useState(actorProfile?.pants_size ?? '');
  const [suit, setSuit] = useState(actorProfile?.suit_size ?? '');
  const [shoe, setShoe] = useState(actorProfile?.shoe_size ?? '');

  const [sports, setSports] = useState<string[]>(actorProfile?.sports ?? []);
  const [dances, setDances] = useState<string[]>(actorProfile?.dances ?? []);
  const [dancesOther, setDancesOther] = useState(actorProfile?.dances_other ?? '');
  const [modelSkills, setModelSkills] = useState<string[]>(actorProfile?.model_skills ?? []);
  const [modelOther, setModelOther] = useState(actorProfile?.model_other ?? '');
  const [performance, setPerformance] = useState<string[]>(
    actorProfile?.performance_skills ?? []
  );
  const [performanceOther, setPerformanceOther] = useState(
    actorProfile?.performance_other ?? ''
  );
  const [accents, setAccents] = useState(actorProfile?.accents ?? '');
  const [instruments, setInstruments] = useState(actorProfile?.instruments ?? '');
  const [special, setSpecial] = useState<string[]>(actorProfile?.special_conditions ?? []);
  const [additionalNotes, setAdditionalNotes] = useState(actorProfile?.additional_notes ?? '');

  const [languages, setLanguages] = useState((actorProfile?.languages ?? []).join(', '));
  const initialActing = parseYesNoDetail(actorProfile?.acting_education);
  const [hasActingEducation, setHasActingEducation] = useState<boolean | null>(initialActing.yes);
  const [actingEducationDetail, setActingEducationDetail] = useState(initialActing.detail);
  const initialDriving = parseYesNoDetail(actorProfile?.driving_info);
  const [hasDriving, setHasDriving] = useState<boolean | null>(initialDriving.yes);
  const [drivingDetail, setDrivingDetail] = useState(initialDriving.detail);
  const [experience, setExperience] = useState(actorProfile?.experience ?? '');
  const [availability, setAvailability] = useState(actorProfile?.availability ?? '');
  const initialAgency = parseYesNoDetail(actorProfile?.other_agency);
  const [hasOtherAgency, setHasOtherAgency] = useState<boolean | null>(initialAgency.yes);
  const [otherAgencyDetail, setOtherAgencyDetail] = useState(initialAgency.detail);
  const [referral, setReferral] = useState(actorProfile?.referral_source ?? '');
  const [specialInterests, setSpecialInterests] = useState(
    actorProfile?.special_interests ?? ''
  );

  const [bankAccountName, setBankAccountName] = useState(actorProfile?.bank_account_name ?? '');
  const [bankName, setBankName] = useState(actorProfile?.bank_name ?? '');
  const [iban, setIban] = useState(actorProfile?.iban ?? '');

  const [hasPassport, setHasPassport] = useState<boolean | null>(
    actorProfile?.has_passport ?? null
  );
  const [passportNo, setPassportNo] = useState(actorProfile?.passport_no ?? '');
  const [passportType, setPassportType] = useState(actorProfile?.passport_type ?? '');
  const [visaCountries, setVisaCountries] = useState(actorProfile?.visa_countries ?? '');
  const [hasWorkPermit, setHasWorkPermit] = useState<boolean | null>(
    actorProfile?.has_work_permit ?? null
  );
  const [hasResidencePermit, setHasResidencePermit] = useState<boolean | null>(
    actorProfile?.has_residence_permit ?? null
  );

  const [kvkk, setKvkk] = useState(Boolean(actorProfile?.kvkk_accepted));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const sportOptions = useMemo(
    () => SPORTS.map((id) => ({ id, label: t(`regForm.sports.${id}`) })),
    [t]
  );
  const danceOptions = useMemo(
    () => DANCES.map((id) => ({ id, label: t(`regForm.dances.${id}`) })),
    [t]
  );
  const modelOptions = useMemo(
    () => MODEL_SKILLS.map((id) => ({ id, label: t(`regForm.model.${id}`) })),
    [t]
  );
  const performanceOptions = useMemo(
    () => PERFORMANCE_SKILLS.map((id) => ({ id, label: t(`regForm.performance.${id}`) })),
    [t]
  );
  const specialOptions = useMemo(
    () => SPECIAL_CONDITIONS.map((id) => ({ id, label: t(`regForm.special.${id}`) })),
    [t]
  );
  const hairOptions = useMemo(
    () => HAIR_COLORS.map((id) => ({ id, label: t(`regForm.hair.${id}`) })),
    [t]
  );
  const eyeOptions = useMemo(
    () => EYE_COLORS.map((id) => ({ id, label: t(`regForm.eyes.${id}`) })),
    [t]
  );
  const clothingOptions = useMemo(
    () => CLOTHING_SIZES.map((id) => ({ id, label: id })),
    []
  );
  const educationOptions = useMemo(
    () => EDUCATION_LEVELS.map((id) => ({ id, label: t(`regForm.education.${id}`) })),
    [t]
  );
  const professionOptions = useMemo(
    () => PROFESSIONS.map((id) => ({ id, label: t(`regForm.profession.${id}`) })),
    [t]
  );

  const pickOne = (setter: (v: string) => void) => (next: string[]) => {
    setter(next[0] ?? '');
  };

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshProfile();
    }, [user, refreshProfile])
  );

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const validate = () => {
    const next: Record<string, string> = {};
    const need = (key: string, ok: boolean) => {
      if (!ok) next[key] = t('common.required');
    };

    need('fullName', fullName.trim().length > 1);
    need('nationalId', /^\d{11}$/.test(nationalId.trim()));
    need('birthDate', /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim()));
    need('birthPlace', birthPlace.trim().length > 0);
    need('phone', phone.trim().length >= 10);
    need('whatsapp', whatsapp.trim().length >= 10);
    need('address', address.trim().length > 0);
    need('gender', gender === 'female' || gender === 'male');
    need('height', Boolean(height) && !Number.isNaN(Number(height)));
    need('weight', Boolean(weight) && !Number.isNaN(Number(weight)));
    need('hair', hair.length > 0);
    need('eyes', eyes.length > 0);
    need('tshirt', tshirt.length > 0);
    need('pants', pants.length > 0);
    need('suit', suit.length > 0);
    need('shoe', shoe.length > 0);
    if (sports.length === 0) next.sports = t('regForm.sportsRequired');
    if (dances.length === 0) next.dances = t('regForm.dancesRequired');
    need('kvkk', kvkk);

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) {
      Alert.alert(t('common.error'), t('regForm.fillRequired'));
      return;
    }
    try {
      setLoading(true);
      await updateProfileBasics(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        // Form gönderilince admin onayı beklenir
        actor_status: 'pending',
      });
      await updateActorProfile(user.id, {
        national_id: nationalId.trim(),
        birth_date: birthDate.trim(),
        birth_place: birthPlace.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        registration_date: registrationDate,
        gender,
        education: education || null,
        profession: profession || null,
        instagram: instagram.trim() || null,
        height_cm: Number(height),
        weight_kg: Number(weight),
        hair_color: hair.trim(),
        eye_color: eyes.trim(),
        tshirt_size: tshirt.trim(),
        pants_size: pants.trim(),
        suit_size: suit.trim(),
        shoe_size: shoe.trim(),
        body_size: [tshirt, pants, suit].filter(Boolean).join(' / ') || null,
        sports,
        dances,
        dances_other: dancesOther.trim() || null,
        model_skills: modelSkills,
        model_other: modelOther.trim() || null,
        performance_skills: performance,
        performance_other: performanceOther.trim() || null,
        accents: accents.trim() || null,
        instruments: instruments.trim() || null,
        special_conditions: special,
        additional_notes: additionalNotes.trim() || null,
        languages: languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        acting_education: serializeYesNoDetail(
          hasActingEducation,
          actingEducationDetail,
          t('regForm.no')
        ),
        driving_info: serializeYesNoDetail(hasDriving, drivingDetail, t('regForm.no')),
        experience: experience.trim() || null,
        availability: availability.trim() || null,
        other_agency: serializeYesNoDetail(hasOtherAgency, otherAgencyDetail, t('regForm.no')),
        referral_source: referral.trim() || null,
        special_interests: specialInterests.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
        bank_name: bankName.trim() || null,
        iban: iban.trim() || null,
        has_passport: hasPassport,
        passport_no: passportNo.trim() || null,
        passport_type: passportType.trim() || null,
        visa_countries: visaCountries.trim() || null,
        has_work_permit: hasWorkPermit,
        has_residence_permit: hasResidencePermit,
        kvkk_accepted: true,
        registration_completed_at: new Date().toISOString(),
        skills: [...sports, ...dances, ...modelSkills, ...performance].filter(
          (id) => id !== 'none'
        ),
      });
      await refreshProfile();
      Alert.alert(t('common.success'));
      router.replace('/');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const BoolRow = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
  }) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.row}>
        {[true, false].map((v) => {
          const active = value === v;
          return (
            <Pressable
              key={String(v)}
              onPress={() => onChange(v)}
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                {v ? t('regForm.yes') : t('regForm.no')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const YesNoDetail = ({
    question,
    detailLabel,
    value,
    detail,
    onChangeYes,
    onChangeDetail,
  }: {
    question: string;
    detailLabel: string;
    value: boolean | null;
    detail: string;
    onChangeYes: (v: boolean) => void;
    onChangeDetail: (v: string) => void;
  }) => (
    <View style={{ gap: Spacing.sm }}>
      <BoolRow
        label={question}
        value={value}
        onChange={(v) => {
          onChangeYes(v);
          if (!v) onChangeDetail('');
        }}
      />
      {value === true ? (
        <TextField
          label={detailLabel}
          value={detail}
          onChangeText={onChangeDetail}
          multiline
          style={{ minHeight: 80 }}
        />
      ) : null}
    </View>
  );

  return (
    <Screen scroll contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}>
      <BackHeader fallbackHref="/(actor)" />
      <Text style={styles.title}>{t('regForm.title')}</Text>
      <Text style={styles.subtitle}>{t('regForm.subtitle')}</Text>

      <Text style={styles.section}>{t('regForm.sections.personal')}</Text>
      <TextField
        label={reqLabel(t('regForm.fields.fullName'))}
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
      />
      <TextField
        label={reqLabel(t('regForm.fields.nationalId'))}
        value={nationalId}
        onChangeText={setNationalId}
        keyboardType="number-pad"
        maxLength={11}
        error={errors.nationalId}
      />
      <TextField
        label={reqLabel(t('regForm.fields.birthDate'))}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="1995-03-21"
        error={errors.birthDate}
      />
      <TextField
        label={reqLabel(t('regForm.fields.birthPlace'))}
        value={birthPlace}
        onChangeText={setBirthPlace}
        error={errors.birthPlace}
      />
      <TextField
        label={reqLabel(t('regForm.fields.phone'))}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <TextField
        label={reqLabel(t('regForm.fields.whatsapp'))}
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        error={errors.whatsapp}
      />
      <TextField
        label={reqLabel(t('regForm.fields.address'))}
        value={address}
        onChangeText={setAddress}
        multiline
        style={{ minHeight: 80 }}
        error={errors.address}
      />
      <TextField
        label={reqLabel(t('regForm.fields.registrationDate'))}
        value={registrationDate}
        editable={false}
      />
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{reqLabel(t('regForm.fields.gender'))}</Text>
        <View style={styles.row}>
          {GENDERS.map((g) => {
            const active = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={[styles.choice, active && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                  {t(`regForm.gender.${g}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.gender ? <Text style={styles.error}>{errors.gender}</Text> : null}
      </View>
      <SelectField
        label={t('regForm.fields.education')}
        value={education}
        options={educationOptions}
        onChange={setEducation}
        placeholder={t('common.select')}
      />
      <SelectField
        label={t('regForm.fields.profession')}
        value={profession}
        options={professionOptions}
        onChange={setProfession}
        placeholder={t('common.select')}
      />
      <TextField
        label={t('regForm.fields.email')}
        value={profile?.email ?? ''}
        editable={false}
      />
      <TextField
        label={t('regForm.fields.instagram')}
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
      />

      <Text style={styles.section}>{t('regForm.sections.physical')}</Text>
      <ValueSlider
        label={reqLabel(t('regForm.fields.height'))}
        value={height ? Number(height) : null}
        onChange={(v) => setHeight(String(v))}
        min={140}
        max={210}
        unit="cm"
        error={errors.height}
      />
      <ValueSlider
        label={reqLabel(t('regForm.fields.weight'))}
        value={weight ? Number(weight) : null}
        onChange={(v) => setWeight(String(v))}
        min={40}
        max={150}
        unit="kg"
        error={errors.weight}
      />
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{reqLabel(t('regForm.fields.hair'))}</Text>
        <ChipSelect
          options={hairOptions}
          selected={hair ? [hair] : []}
          onChange={pickOne(setHair)}
          multiple={false}
          error={errors.hair}
        />
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{reqLabel(t('regForm.fields.eyes'))}</Text>
        <ChipSelect
          options={eyeOptions}
          selected={eyes ? [eyes] : []}
          onChange={pickOne(setEyes)}
          multiple={false}
          error={errors.eyes}
        />
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{reqLabel(t('regForm.fields.tshirt'))}</Text>
        <ChipSelect
          options={clothingOptions}
          selected={tshirt ? [tshirt] : []}
          onChange={pickOne(setTshirt)}
          multiple={false}
          error={errors.tshirt}
        />
      </View>
      <ValueSlider
        label={reqLabel(t('regForm.fields.pants'))}
        value={pants ? Number(pants) : null}
        onChange={(v) => setPants(String(v))}
        min={34}
        max={56}
        step={2}
        error={errors.pants}
      />
      <ValueSlider
        label={reqLabel(t('regForm.fields.suit'))}
        value={suit ? Number(suit) : null}
        onChange={(v) => setSuit(String(v))}
        min={44}
        max={62}
        step={2}
        error={errors.suit}
      />
      <ValueSlider
        label={reqLabel(t('regForm.fields.shoe'))}
        value={shoe ? Number(shoe) : null}
        onChange={(v) => setShoe(String(v))}
        min={35}
        max={50}
        error={errors.shoe}
      />

      <Text style={styles.section}>{reqLabel(t('regForm.sections.sports'))}</Text>
      <ChipSelect
        options={sportOptions}
        selected={sports}
        onChange={setSports}
        exclusiveNoneId="none"
        error={errors.sports}
      />

      <Text style={styles.section}>{reqLabel(t('regForm.sections.dances'))}</Text>
      <ChipSelect
        options={danceOptions}
        selected={dances}
        onChange={setDances}
        exclusiveNoneId="none"
        error={errors.dances}
      />
      {dances.includes('other') ? (
        <TextField
          label={t('regForm.fields.dancesOther')}
          value={dancesOther}
          onChangeText={setDancesOther}
        />
      ) : null}

      <Text style={styles.section}>{t('regForm.sections.model')}</Text>
      <ChipSelect options={modelOptions} selected={modelSkills} onChange={setModelSkills} />
      {modelSkills.includes('other') ? (
        <TextField
          label={t('regForm.fields.modelOther')}
          value={modelOther}
          onChangeText={setModelOther}
        />
      ) : null}

      <Text style={styles.section}>{t('regForm.sections.performance')}</Text>
      <ChipSelect
        options={performanceOptions}
        selected={performance}
        onChange={setPerformance}
      />
      <TextField
        label={t('regForm.fields.accents')}
        value={accents}
        onChangeText={setAccents}
        multiline
      />
      <TextField
        label={t('regForm.fields.instruments')}
        value={instruments}
        onChangeText={setInstruments}
        multiline
      />
      <TextField
        label={t('regForm.fields.performanceOther')}
        value={performanceOther}
        onChangeText={setPerformanceOther}
        multiline
      />

      <Text style={styles.section}>{t('regForm.sections.special')}</Text>
      <ChipSelect options={specialOptions} selected={special} onChange={setSpecial} />
      <TextField
        label={t('regForm.fields.additionalNotes')}
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        multiline
        style={{ minHeight: 90 }}
      />

      <Text style={styles.section}>{t('regForm.sections.questions')}</Text>
      <TextField
        label={t('regForm.fields.languages')}
        value={languages}
        onChangeText={setLanguages}
        multiline
      />
      <YesNoDetail
        question={t('regForm.fields.actingEducation')}
        detailLabel={t('regForm.fields.actingEducationDetail')}
        value={hasActingEducation}
        detail={actingEducationDetail}
        onChangeYes={setHasActingEducation}
        onChangeDetail={setActingEducationDetail}
      />
      <YesNoDetail
        question={t('regForm.fields.drivingInfo')}
        detailLabel={t('regForm.fields.drivingInfoDetail')}
        value={hasDriving}
        detail={drivingDetail}
        onChangeYes={setHasDriving}
        onChangeDetail={setDrivingDetail}
      />
      <TextField
        label={t('regForm.fields.experience')}
        value={experience}
        onChangeText={setExperience}
        multiline
      />
      <TextField
        label={t('regForm.fields.availability')}
        value={availability}
        onChangeText={setAvailability}
        multiline
      />
      <YesNoDetail
        question={t('regForm.fields.otherAgency')}
        detailLabel={t('regForm.fields.otherAgencyDetail')}
        value={hasOtherAgency}
        detail={otherAgencyDetail}
        onChangeYes={setHasOtherAgency}
        onChangeDetail={setOtherAgencyDetail}
      />
      <TextField
        label={t('regForm.fields.referral')}
        value={referral}
        onChangeText={setReferral}
        multiline
      />
      <TextField
        label={t('regForm.fields.specialInterests')}
        value={specialInterests}
        onChangeText={setSpecialInterests}
        multiline
      />

      <Text style={styles.section}>{t('regForm.sections.bank')}</Text>
      <TextField
        label={t('regForm.fields.bankAccountName')}
        value={bankAccountName}
        onChangeText={setBankAccountName}
      />
      <TextField
        label={t('regForm.fields.bankName')}
        value={bankName}
        onChangeText={setBankName}
      />
      <TextField label={t('regForm.fields.iban')} value={iban} onChangeText={setIban} autoCapitalize="characters" />

      <Text style={styles.section}>{t('regForm.sections.passport')}</Text>
      <BoolRow label={t('regForm.fields.hasPassport')} value={hasPassport} onChange={setHasPassport} />
      <TextField
        label={t('regForm.fields.passportNo')}
        value={passportNo}
        onChangeText={setPassportNo}
      />
      <TextField
        label={t('regForm.fields.passportType')}
        value={passportType}
        onChangeText={setPassportType}
      />
      <TextField
        label={t('regForm.fields.visaCountries')}
        value={visaCountries}
        onChangeText={setVisaCountries}
        multiline
      />
      <BoolRow
        label={t('regForm.fields.hasWorkPermit')}
        value={hasWorkPermit}
        onChange={setHasWorkPermit}
      />
      <BoolRow
        label={t('regForm.fields.hasResidencePermit')}
        value={hasResidencePermit}
        onChange={setHasResidencePermit}
      />

      <Text style={styles.section}>{t('regForm.sections.consent')}</Text>
      <Pressable
        onPress={() => setKvkk((v) => !v)}
        style={[styles.consent, kvkk && styles.consentActive]}
      >
        <View style={[styles.checkbox, kvkk && styles.checkboxOn]} />
        <Text style={styles.consentText}>{t('regForm.fields.kvkk')}</Text>
      </Pressable>
      {errors.kvkk ? <Text style={styles.error}>{errors.kvkk}</Text> : null}

      <Button
        label={t('regForm.submit')}
        onPress={onSubmit}
        loading={loading}
        style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  section: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  fieldBlock: { gap: Spacing.xs, marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  choiceActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  choiceText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text },
  choiceTextActive: { color: Colors.textOnDark },
  error: { fontFamily: Fonts.body, fontSize: 12, color: Colors.danger },
  consent: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  consentActive: { borderColor: Colors.ink },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  consentText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
