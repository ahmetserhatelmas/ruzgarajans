import type { ImageSourcePropType } from 'react-native';
import type { GalleryPhotoKind } from '@/services/gallery';

export type PhotoExampleItem = {
  source: ImageSourcePropType;
  aspectRatio: number;
  captionKey?: 'exampleHandsPalms' | 'exampleHandsBacks';
};

export const PHOTO_EXAMPLES: Partial<Record<GalleryPhotoKind, PhotoExampleItem[]>> = {
  full_body: [{ source: require('../assets/images/examples/full_body.png'), aspectRatio: 374 / 650 }],
  chest: [{ source: require('../assets/images/examples/chest.png'), aspectRatio: 488 / 267 }],
  profile_right: [{ source: require('../assets/images/examples/profile_right.png'), aspectRatio: 431 / 298 }],
  profile_left: [{ source: require('../assets/images/examples/profile_left.png'), aspectRatio: 431 / 310 }],
  hands: [{ source: require('../assets/images/examples/hands.png'), aspectRatio: 486 / 171 }],
};
