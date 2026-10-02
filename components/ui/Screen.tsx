import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { useKeyboardOverlapPad } from '@/lib/keyboardOverlap';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  /** Stays pinned at the top-left while the page scrolls. */
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export const Screen = React.forwardRef<ScrollView, Props>(function Screen(
  { children, scroll, header, style, contentStyle, onScroll },
  ref
) {
  const keyboardPad = useKeyboardOverlapPad();

  const pinned = header ? <View style={styles.header}>{header}</View> : null;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
        {pinned}
        <ScrollView
          ref={ref}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Spacing.xl + keyboardPad + 24 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {pinned}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.paper,
    zIndex: 20,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
