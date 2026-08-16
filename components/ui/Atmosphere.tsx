import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

/** Soft atmospheric backdrop without flat single color */
export function LinearGradient() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <View style={styles.grain} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.paper,
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E8D9B0',
    opacity: 0.55,
  },
  blobBottom: {
    position: 'absolute',
    bottom: 40,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#D9C4B0',
    opacity: 0.4,
  },
  grain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
