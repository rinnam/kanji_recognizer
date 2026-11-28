import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AdminDashboardIcon } from '../../src/components/AppIcons';
import { adminLoginApi } from '../../src/features/auth/auth-store';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAdminLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Vui lòng nhập địa chỉ email quản trị hợp lệ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await adminLoginApi(trimmedEmail, password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập quản trị thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.centerContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandBadge}>
              <AdminDashboardIcon size={24} color="#FFFFFF" active />
            </View>
            <Text style={styles.title}>Kanji Smart · Quản trị</Text>
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email quản trị viên"
            placeholderTextColor="#71717A"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            placeholderTextColor="#71717A"
            secureTextEntry
            onSubmitEditing={() => void handleAdminLogin()}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={() => void handleAdminLogin()}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? 'Đang xác thực…' : 'Đăng nhập quản trị'}
            </Text>
          </Pressable>

          <Pressable style={styles.backBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.backText}>← Về trang đăng nhập học viên</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111113',
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 26,
    gap: 12,
  },
  brand: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F48A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FAFAFA',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FAFAFA',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  primaryBtn: {
    backgroundColor: '#F48A34',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backText: {
    color: '#A1A1AA',
    fontWeight: '600',
    fontSize: 12,
  },
});
