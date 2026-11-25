import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';

interface ShadowingToolbarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  onSeekRelative: (offsetSeconds: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  autoPause: boolean;
  onToggleAutoPause: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
}

export function ShadowingToolbar({
  isPlaying,
  onTogglePlay,
  onPrevLine,
  onNextLine,
  onSeekRelative,
  speed,
  onChangeSpeed,
  autoPause,
  onToggleAutoPause,
  isLooping,
  onToggleLoop,
}: ShadowingToolbarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
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
    <View style={styles.card}>
      {/* Playback Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.btnGroup}>
          <Pressable style={styles.btn} onPress={() => onSeekRelative(-5)}>
            <Text style={styles.btnText}>-5s</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={onPrevLine}>
            <PrevIcon size={16} color="#4A3E35" />
          </Pressable>

          <Pressable style={[styles.btn, styles.playBtn]} onPress={onTogglePlay}>
            {isPlaying ? <PauseIcon size={18} color="#FFFFFF" /> : <PlayIcon size={18} color="#FFFFFF" />}
          </Pressable>

          <Pressable style={styles.btn} onPress={onNextLine}>
            <NextIcon size={16} color="#4A3E35" />
          </Pressable>

          <Pressable style={styles.btn} onPress={() => onSeekRelative(5)}>
            <Text style={styles.btnText}>+5s</Text>
          </Pressable>
        </View>

        {/* Speed Selector */}
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

      {/* Shadowing Features: Auto-Pause & Loop & Voice Recorder */}
      <View style={styles.featureRow}>
        <Pressable
          style={[styles.featureChip, autoPause && styles.featureChipActive]}
          onPress={onToggleAutoPause}
        >
          <Text style={[styles.featureChipText, autoPause && styles.featureChipTextActive]}>
            {autoPause ? '⏸️ Dừng mỗi câu: BẬT' : '⏸️ Dừng mỗi câu: TẮT'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.featureChip, isLooping && styles.featureChipActive]}
          onPress={onToggleLoop}
        >
          <Text style={[styles.featureChipText, isLooping && styles.featureChipTextActive]}>
            {isLooping ? '🔁 Lặp câu: BẬT' : '🔁 Lặp câu: TẮT'}
          </Text>
        </Pressable>

        {/* Voice recording button */}
        {!isRecording ? (
          <Pressable style={styles.recordBtn} onPress={startRecording}>
            <Text style={styles.recordBtnText}>🎙️ Ghi âm nhại giọng</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.recordBtn, styles.recordingActive]} onPress={stopRecording}>
            <Text style={styles.recordBtnText}>⏹️ Dừng ghi ({recordingSeconds}s)</Text>
          </Pressable>
        )}

        {recordedUrl && !isRecording ? (
          <Pressable style={styles.listenBackBtn} onPress={playRecordedAudio}>
            <Text style={styles.listenBackText}>🎧 Nghe lại giọng mình</Text>
          </Pressable>
        ) : null}
      </View>
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
});
