import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { TextField } from '@/components/ui/TextField';
import { LanguageSkillsField } from '@/components/ui/LanguageSkillsField';
import { Button } from '@/components/ui/Button';
import { parseLanguageSkills, serializeLanguageSkills } from '@/constants/languages';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearProfileImage,
  updateActorProfile,
  updateProfileBasics,
  uploadProfileImage,
} from '@/services/actors';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, actorProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(actorProfile?.bio ?? '');
  const [height, setHeight] = useState(actorProfile?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(actorProfile?.weight_kg?.toString() ?? '');
  const [hair, setHair] = useState(actorProfile?.hair_color ?? '');
  const [eyes, setEyes] = useState(actorProfile?.eye_color ?? '');
  const [shoe, setShoe] = useState(actorProfile?.shoe_size ?? '');
  const [body, setBody] = useState(actorProfile?.body_size ?? '');
  const [education, setEducation] = useState(actorProfile?.education ?? '');
  const [experience, setExperience] = useState(actorProfile?.experience ?? '');
  const [languages, setLanguages] = useState(parseLanguageSkills(actorProfile?.languages));
  const [skills, setSkills] = useState((actorProfile?.skills ?? []).join(', '));
  const [city, setCity] = useState(actorProfile?.city ?? '');
  const [loading, setLoading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<'avatar' | 'cover' | null>(null);

  const removeImage = (role: 'avatar' | 'cover') => {
    if (!user) return;
    Alert.alert(
      t('profile.deleteImageTitle', { label: t(`media.${role}`) }),
      t('profile.deletePhotoBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setPhotoBusy(role);
                await clearProfileImage(user.id, role);
                await refreshProfile();
              } catch (e: any) {
                Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              } finally {
                setPhotoBusy(null);
              }
            })();
          },
        },
      ]
    );
  };

  const uploadImage = async (role: 'avatar' | 'cover') => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      setPhotoBusy(role);
      await uploadProfileImage({
        userId: user.id,
        localUri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
        role,
      });
      await refreshProfile();
      Alert.alert(t('common.success'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setPhotoBusy(null);
    }
  };

  const onSave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await updateProfileBasics(user.id, { full_name: fullName });
      await updateActorProfile(user.id, {
        bio,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        hair_color: hair,
        eye_color: eyes,
        shoe_size: shoe,
        body_size: body,
        education,
        experience,
        languages: serializeLanguageSkills(languages),
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        city,
      });
      await refreshProfile();
      Alert.alert(t('common.success'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}>
      <BackHeader fallbackHref="/(actor)/profile" />
      <Text style={styles.title}>{t('profile.edit')}</Text>

      <View style={styles.photoRow}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarPreview} />
        ) : (
          <View style={[styles.avatarPreview, styles.avatarEmpty]} />
        )}
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <Button
            label={profile?.avatar_url ? t('media.changePhoto') : t('media.avatar')}
            variant="secondary"
            loading={photoBusy === 'avatar'}
            onPress={() => void uploadImage('avatar')}
          />
          {profile?.avatar_url ? (
            <Button
              label={t('common.delete')}
              variant="danger"
              loading={photoBusy === 'avatar'}
              onPress={() => removeImage('avatar')}
            />
          ) : null}
          <Button
            label={profile?.cover_url ? t('media.changePhoto') : t('media.cover')}
            variant="secondary"
            loading={photoBusy === 'cover'}
            onPress={() => void uploadImage('cover')}
          />
          {profile?.cover_url ? (
            <Button
              label={t('common.delete')}
              variant="danger"
              loading={photoBusy === 'cover'}
              onPress={() => removeImage('cover')}
            />
          ) : null}
        </View>
      </View>
      {profile?.cover_url ? (
        <Image source={{ uri: profile.cover_url }} style={styles.coverPreview} />
      ) : null}

      <TextField label={t('auth.fullName')} value={fullName} onChangeText={setFullName} />
      <TextField label={t('profile.city')} value={city} onChangeText={setCity} />
      <TextField label={t('profile.bio')} value={bio} onChangeText={setBio} multiline />
      <TextField
        label={t('profile.height')}
        value={height}
        onChangeText={setHeight}
        keyboardType="numeric"
      />
      <TextField
        label={t('profile.weight')}
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />
      <TextField label={t('profile.hair')} value={hair} onChangeText={setHair} />
      <TextField label={t('profile.eyes')} value={eyes} onChangeText={setEyes} />
      <TextField label={t('profile.shoe')} value={shoe} onChangeText={setShoe} />
      <TextField label={t('profile.body')} value={body} onChangeText={setBody} />
      <TextField
        label={t('profile.education')}
        value={education}
        onChangeText={setEducation}
        multiline
      />
      <TextField
        label={t('profile.experience')}
        value={experience}
        onChangeText={setExperience}
        multiline
      />
      <LanguageSkillsField
        label={t('profile.languages')}
        value={languages}
        onChange={setLanguages}
      />
      <TextField label={t('profile.skills')} value={skills} onChangeText={setSkills} />
      <Button
        label={t('common.save')}
        onPress={onSave}
        loading={loading}
        style={{ marginTop: Spacing.md, marginBottom: Spacing.xxl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.paperMuted,
  },
  avatarEmpty: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: Colors.paperMuted,
  },
});
