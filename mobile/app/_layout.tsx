import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      <FloatingBottomDock />
      <FloatingUtilityDock />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
