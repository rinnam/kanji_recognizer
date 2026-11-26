import React, { useState, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { nihongoTheme } from '../../theme/nihongo-theme';
import { libraryEndpoint } from '../../library-source';

interface HandwritingModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectKanji: (kanji: string) => void;
}

function pointsToSvgPath(points: number[][]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const pt = points[0];
    if (!pt) return '';
    return `M ${pt[0]} ${pt[1]} L ${pt[0] + 0.1} ${pt[1] + 0.1}`;
  }
  const first = points[0];
  if (!first) return '';
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt) d += ` L ${pt[0]} ${pt[1]}`;
  }
  return d;
}

export function HandwritingModal({
  visible,
  onClose,
  onSelectKanji,
}: HandwritingModalProps) {
  const [strokes, setStrokes] = useState<number[][][]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const strokesRef = useRef<number[][][]>([]);
  strokesRef.current = strokes;

  const currentStrokeRef = useRef<number[][]>([]);
  currentStrokeRef.current = currentStroke;

  const recognize = async (strokesToRecognize: number[][][]) => {
    if (strokesToRecognize.length === 0) {
      setCandidates([]);
      return;
    }

    setLoading(true);
    try {
      const base = libraryEndpoint || 'http://localhost:3000/api';
      const res = await fetch(`${base.replace(/\/+$/, '')}/kanji/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strokes: strokesToRecognize }),
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.warn('Kanji recognition failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const initial = [[Math.round(locationX), Math.round(locationY)]];
          setCurrentStroke(initial);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke((prev) => [
            ...prev,
            [Math.round(locationX), Math.round(locationY)],
          ]);
        },
        onPanResponderRelease: () => {
          const finished = currentStrokeRef.current;
          if (finished.length > 0) {
            const nextStrokes = [...strokesRef.current, finished];
            setStrokes(nextStrokes);
            setCurrentStroke([]);
            void recognize(nextStrokes);
          }
        },
      }),
    [],
  );

  const handleDeleteLast = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    void recognize(nextStrokes);
  };

  const handleClearAll = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setCandidates([]);
  };

  const totalStrokeCount = strokes.length + (currentStroke.length > 0 ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nhận diện Kanji viết tay</Text>
              <Text style={styles.subtitle}>
                Dùng ngón tay vẽ chữ Hán vào khung, AI nhận diện tự động
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Canvas Box */}
          <View style={styles.canvasContainer}>
            <View style={styles.canvasBox} {...panResponder.panHandlers}>
              <Svg width={280} height={280} viewBox="0 0 280 280">
                {/* 4-quadrant guidelines */}
                <Line
                  x1={0}
                  y1={140}
                  x2={280}
                  y2={140}
                  stroke="#EBE4DC"
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />
                <Line
                  x1={140}
                  y1={0}
                  x2={140}
                  y2={280}
                  stroke="#EBE4DC"
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />

                {/* Drawn strokes */}
                {strokes.map((stroke, idx) => (
                  <Path
                    key={idx}
                    d={pointsToSvgPath(stroke)}
                    stroke="#1E1E1E"
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}

                {/* Active drawing stroke */}
                {currentStroke.length > 0 && (
                  <Path
                    d={pointsToSvgPath(currentStroke)}
                    stroke="#1E1E1E"
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </Svg>

              {totalStrokeCount === 0 && (
                <View style={styles.hintContainer} pointerEvents="none">
                  <Text style={styles.hintText}>Vẽ chữ vào đây</Text>
                </View>
              )}
            </View>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <Pressable
              style={[styles.toolBtn, strokes.length === 0 && styles.toolBtnDisabled]}
              onPress={handleDeleteLast}
              disabled={strokes.length === 0}
            >
              <Text style={styles.toolBtnText}>↩️ Lùi 1 nét</Text>
            </Pressable>

            <Pressable
              style={[styles.toolBtn, strokes.length === 0 && styles.toolBtnDisabled]}
              onPress={handleClearAll}
              disabled={strokes.length === 0}
            >
              <Text style={styles.toolBtnText}>🗑️ Xóa hết</Text>
            </Pressable>

            <Pressable
              style={[styles.toolBtn, styles.recognizeBtn]}
              onPress={() => void recognize(strokes)}
            >
              <Text style={styles.recognizeBtnText}>
                {loading ? 'Đang nhận diện...' : '🔍 Nhận diện'}
              </Text>
            </Pressable>
          </View>

          {/* Candidate suggestions */}
          <View style={styles.candidatesSection}>
            <Text style={styles.candidatesTitle}>
              {candidates.length > 0
                ? 'Gợi ý Hán tự (chạm để chọn):'
                : totalStrokeCount > 0
                ? 'Đang nhận diện nét vẽ...'
                : 'Chưa có nét vẽ'}
            </Text>

            <View style={styles.candidatesRow}>
              {candidates.length > 0 ? (
                candidates.map((kanji, idx) => (
                  <Pressable
                    key={`${kanji}-${idx}`}
                    style={styles.candidateChip}
                    onPress={() => {
                      onSelectKanji(kanji);
                      onClose();
                    }}
                  >
                    <Text style={styles.candidateText}>{kanji}</Text>
                  </Pressable>
                ))
              ) : (
                ['—', '—', '—', '—', '—'].map((c, idx) => (
                  <View key={idx} style={[styles.candidateChip, styles.candidateEmpty]}>
                    <Text style={styles.candidateEmptyText}>{c}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasBox: {
    width: 280,
    height: 280,
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  hintContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#8A8078',
    backgroundColor: 'rgba(255, 253, 249, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: nihongoTheme.radius.button,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnDisabled: {
    opacity: 0.5,
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  recognizeBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  recognizeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  candidatesSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    paddingTop: 12,
  },
  candidatesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  candidatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.borderWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateText: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  candidateEmpty: {
    opacity: 0.4,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderWidth: 1,
  },
  candidateEmptyText: {
    fontSize: 16,
    color: nihongoTheme.colors.textMuted,
  },
});
