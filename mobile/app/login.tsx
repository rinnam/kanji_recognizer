import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { MomoAvatar } from '../src/components/MomoAvatar';
import { nihongoTheme } from '../src/theme/nihongo-theme';
import { loginApi } from '../src/features/auth/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('user1@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginApi(email, password);
      router.replace('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell scroll={false} contentStyle={styles.centerShell}>
      <View style={styles.card}>
        <View style={styles.brand}>
          <MomoAvatar size={54} />
          <Text style={styles.title}>Đăng nhập NihonGO</Text>
          <Text style={styles.subtitle}>Đồng bộ dữ liệu học & tham gia game đối kháng</Text>
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

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={styles.googleBtn}
          onPress={() => {
            if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
              setError('Cần cấu hình EXPO_PUBLIC_GOOGLE_CLIENT_ID (Google Cloud Console) trong mobile/.env để bật Google OAuth.');
            }
          }}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Tiếp tục với Google</Text>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: nihongoTheme.colors.borderWarm,
  },
  dividerText: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EA4335',
  },
  googleText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
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
