import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, Modal } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import {
  MicIcon,
  MoreVerticalIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SubtitlesIcon,
  TranslateIcon,
  VolumeIcon,
} from '../../components/AppIcons';

interface ShadowingToolbarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  autoPause: boolean;
  onToggleAutoPause: () => void;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  transcriptOpen?: boolean;
  onOpenTranscript?: () => void;
}

export function ShadowingToolbar({
  isPlaying,
  onTogglePlay,
  onPrevLine,
  onNextLine,
  speed,
  onChangeSpeed,
  autoPause,
  onToggleAutoPause,
  showTranslation = true,
  onToggleTranslation,
  transcriptOpen = false,
  onOpenTranscript,
}: ShadowingToolbarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const SPEEDS = [0.75, 1.0, 1.25];

  const startRecording = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      Alert.alert('Thông báo', 'Tính năng ghi âm hiện hỗ trợ trên giao diện web trình duyệt.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Lỗi', 'Không thể truy cập Microphone. Vui lòng cấp quyền micro cho trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playRecordedAudio = () => {
    if (!recordedUrl || typeof Audio === 'undefined') return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(recordedUrl);
    } else {
      audioPlayerRef.current.src = recordedUrl;
    }
    audioPlayerRef.current.play();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  return (
    <View style={[styles.card, styles.cardCompact]}>
      <View style={styles.compactRow}>
        <View style={styles.btnGroup}>
          <Pressable style={styles.btn} onPress={onPrevLine} accessibilityLabel="Câu trước">
            <PrevIcon size={16} color="#4A3E35" />
          </Pressable>

          <Pressable style={[styles.btn, styles.playBtn]} onPress={onTogglePlay} accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}>
            {isPlaying ? <PauseIcon size={18} color="#FFFFFF" /> : <PlayIcon size={18} color="#FFFFFF" />}
          </Pressable>

          <Pressable style={styles.btn} onPress={onNextLine} accessibilityLabel="Câu tiếp theo">
            <NextIcon size={16} color="#4A3E35" />
          </Pressable>
        </View>

        <View style={styles.compactActions}>
          {!isRecording ? (
            <Pressable
              style={[styles.iconActionBtn, styles.recordIconBtn]}
              onPress={startRecording}
              accessibilityLabel="Ghi âm nhại giọng"
            >
              <MicIcon size={17} color="#991B1B" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.iconActionBtn, styles.recordingActive]}
              onPress={stopRecording}
              accessibilityLabel={`Dừng ghi âm ${recordingSeconds} giây`}
            >
              <MicIcon size={17} color="#FFFFFF" />
            </Pressable>
          )}

          {recordedUrl && !isRecording ? (
            <Pressable
              style={[styles.iconActionBtn, styles.listenBackIconBtn]}
              onPress={playRecordedAudio}
              accessibilityLabel="Nghe lại giọng mình"
            >
              <VolumeIcon size={17} color="#0369A1" />
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.iconActionBtn, showTranslation && styles.iconActionBtnActive]}
            onPress={onToggleTranslation}
            accessibilityLabel={showTranslation ? 'Tắt dịch câu' : 'Bật dịch câu'}
          >
            <TranslateIcon size={17} color={showTranslation ? '#FFFFFF' : '#6E6055'} />
          </Pressable>

          <Pressable
            style={[styles.iconActionBtn, transcriptOpen && styles.iconActionBtnActive]}
            onPress={onOpenTranscript}
            accessibilityLabel={transcriptOpen ? 'Đóng phụ đề video' : 'Mở phụ đề video'}
          >
            <SubtitlesIcon size={17} color={transcriptOpen ? '#FFFFFF' : '#6E6055'} />
          </Pressable>

          <Pressable
            style={[styles.iconActionBtn, (autoPause || speed !== 1.0) && styles.iconActionBtnTinted]}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Tùy chọn phát video"
          >
            <MoreVerticalIcon size={18} color="#4A3E35" />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>Tùy chọn phát</Text>

            <View style={styles.menuSection}>
              <Text style={styles.menuLabel}>Tốc độ video</Text>
              <View style={styles.speedRow}>
                {SPEEDS.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                    onPress={() => onChangeSpeed(s)}
                  >
                    <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>
                      {s}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.menuToggleRow, autoPause && styles.menuToggleRowActive]}
              onPress={onToggleAutoPause}
            >
              <View style={styles.menuToggleLeft}>
                <PauseIcon size={15} color={autoPause ? nihongoTheme.colors.accentHover : '#6E6055'} />
                <Text style={[styles.menuToggleText, autoPause && styles.menuToggleTextActive]}>
                  Dừng lại mỗi câu
                </Text>
              </View>
              <Text style={[styles.menuBadge, autoPause && styles.menuBadgeActive]}>
                {autoPause ? 'BẬT' : 'TẮT'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nihongoTheme.colors.accent,
  },
  playBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  speedRow: {
    flexDirection: 'row',
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    padding: 2,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: nihongoTheme.radius.pill,
  },
  speedBtnActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  speedTextActive: {
    color: '#FFFFFF',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  featureChipActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  featureChipTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  recordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: '#FEE2E2',
  },
  recordingActive: {
    backgroundColor: '#EF4444',
  },
  recordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  listenBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: '#E0F2FE',
  },
  listenBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  cardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  iconActionBtnTinted: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  recordIconBtn: {
    backgroundColor: '#FEE2E2',
  },
  listenBackIconBtn: {
    backgroundColor: '#E0F2FE',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  menuSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  menuToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: nihongoTheme.radius.button,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
  },
  menuToggleRowActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderColor: nihongoTheme.colors.accent,
  },
  menuToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  menuToggleTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  menuBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textMuted,
  },
  menuBadgeActive: {
    color: nihongoTheme.colors.accentHover,
  },
});
