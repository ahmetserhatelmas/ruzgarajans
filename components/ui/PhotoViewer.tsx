import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  uri: string | null;
  title?: string;
  onClose: () => void;
};

export function PhotoViewer({ uri, title, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(Boolean(uri));
  }, [uri]);

  return (
    <Modal
      visible={Boolean(uri)}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.wrap, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom }]}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? ''}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('common.done')}</Text>
          </Pressable>
        </View>
        <View style={styles.imageWrap}>
          {loading ? (
            <ActivityIndicator style={StyleSheet.absoluteFill} color={Colors.gold} />
          ) : null}
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          ) : (
            <View style={styles.image} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.ink },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.gold,
  },
  close: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.gold,
  },
  imageWrap: { flex: 1, width: '100%', backgroundColor: '#000' },
  image: { flex: 1, width: '100%' },
});
