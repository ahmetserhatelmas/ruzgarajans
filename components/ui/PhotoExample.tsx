import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PHOTO_EXAMPLES } from '@/constants/photoExamples';
import type { GalleryPhotoKind } from '@/services/gallery';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function FittedExample({
  source,
  aspectRatio,
}: {
  source: ImageSourcePropType;
  aspectRatio: number;
}) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  return (
    <View style={styles.frame} onLayout={onLayout}>
      {width > 0 ? (
        <Image
          source={source}
          style={{ width, height: width / aspectRatio }}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

export function PhotoExample({ kind }: { kind: GalleryPhotoKind }) {
  const { t } = useTranslation();
  const items = PHOTO_EXAMPLES[kind];
  if (!items?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>{t('media.photoExample')}</Text>
      <Text style={styles.hint}>{t('media.photoExampleHint')}</Text>
      {items.map((item, index) => (
        <View key={`${kind}-${index}`} style={styles.item}>
          {item.captionKey ? (
            <Text style={styles.caption}>{t(`media.${item.captionKey}`)}</Text>
          ) : null}
          <FittedExample source={item.source} aspectRatio={item.aspectRatio} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.paperMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.brand,
    letterSpacing: 0.3,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  item: {
    alignSelf: 'stretch',
  },
  caption: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.text,
  },
  frame: {
    alignSelf: 'stretch',
    borderRadius: Radius.sm,
    backgroundColor: '#E8E8E8',
  },
});
