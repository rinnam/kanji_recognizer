import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { MomoAvatar } from '../src/components/MomoAvatar';
import { nihongoTheme } from '../src/theme/nihongo-theme';
import { loginApi } from '../src/features/auth/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const session = await loginApi(trimmedEmail, password);
      router.replace(session.user.role === 'admin' ? '/admin' : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell scroll contentStyle={styles.centerShell}>
      <View style={styles.card}>
        <View style={styles.brand}>
          <MomoAvatar size={54} />
          <Text style={styles.title}>Đăng nhập Kanji Smart</Text>
          <Text style={styles.subtitle}>Đồng bộ dữ liệu học &amp; tham gia game đối kháng</Text>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email (vd: user1@gmail.com)"
          placeholderTextColor={nihongoTheme.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          placeholderTextColor={nihongoTheme.colors.textMuted}
          secureTextEntry
          onSubmitEditing={() => void handleLogin()}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={() => void handleLogin()} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</Text>
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký ngay</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centerShell: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
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
