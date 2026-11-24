import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="app" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="practice" options={{ title: 'Luyện tập' }} />
      <Tabs.Screen name="lookup" options={{ title: 'Tra cứu' }} />
      <Tabs.Screen name="lessons" options={{ title: 'Bài học' }} />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    </Tabs>
  );
}
