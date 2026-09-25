import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickedAsset = {
  uri: string;
  mimeType?: string | null;
};

const COMPAT = ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible;

export async function pickFromLibrary(
  kind: 'images' | 'videos',
  videoMaxDuration?: number
): Promise<PickedAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: [kind],
    quality: kind === 'images' ? 0.85 : 0.8,
    preferredAssetRepresentationMode: COMPAT,
    ...(kind === 'videos' && videoMaxDuration ? { videoMaxDuration } : {}),
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, mimeType: asset.mimeType };
}

export async function takePhoto(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    exif: false,
    preferredAssetRepresentationMode: COMPAT,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, mimeType: asset.mimeType };
}

export async function takeVideo(videoMaxDuration?: number): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    quality: 0.8,
    preferredAssetRepresentationMode: COMPAT,
    ...(videoMaxDuration ? { videoMaxDuration } : {}),
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, mimeType: asset.mimeType };
}

export function chooseImageSource(
  labels: { title: string; camera: string; gallery: string; cancel: string },
  onPicked: (asset: PickedAsset) => void
) {
  Alert.alert(labels.title, undefined, [
    {
      text: labels.camera,
      onPress: () => {
        void takePhoto().then((asset) => {
          if (asset) onPicked(asset);
        });
      },
    },
    {
      text: labels.gallery,
      onPress: () => {
        void pickFromLibrary('images').then((asset) => {
          if (asset) onPicked(asset);
        });
      },
    },
    { text: labels.cancel, style: 'cancel' },
  ]);
}
