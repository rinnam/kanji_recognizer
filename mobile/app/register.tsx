import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { MomoAvatar } from '../src/components/MomoAvatar';
import { nihongoTheme } from '../src/theme/nihongo-theme';
import { registerApi } from '../src/features/auth/auth-store';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setBusy(true);
    try {
      await registerApi(email, password, displayName);
      router.replace('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.brand}>
            <MomoAvatar size={54} />
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>Tham gia học tiếng Nhật & đấu đối kháng Kotoba</Text>
          </View>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Tên hiển thị"
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={nihongoTheme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            placeholderTextColor={nihongoTheme.colors.textMuted}
            secureTextEntry
            onSubmitEditing={() => void handleRegister()}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={() => void handleRegister()} disabled={busy}>
            <Text style={styles.primaryBtnText}>{busy ? 'Đang tạo tài khoản…' : 'Đăng ký'}</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 32,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 24,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  brand: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
});
