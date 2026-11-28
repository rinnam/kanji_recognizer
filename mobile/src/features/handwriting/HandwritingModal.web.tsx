import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import { AlertCircleIcon, SearchNavIcon, TrashIcon, UndoIcon } from '../../components/AppIcons';

declare global {
  interface Window {
    KanjiCanvas?: {
      init: (id: string) => void;
      recognize: (id: string) => string;
      erase: (id: string) => void;
      deleteLast: (id: string) => void;
      refPatterns: unknown[];
      [key: string]: any;
    };
  }
}

interface HandwritingModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectKanji: (kanji: string) => void;
}

export function HandwritingModal({
  visible,
  onClose,
  onSelectKanji,
}: HandwritingModalProps) {
  const canvasId = useRef(`kanji-canvas-${Math.random().toString(36).slice(2, 8)}`).current;
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [strokeCount, setStrokeCount] = useState(0);

  const runRecognition = useCallback(() => {
    if (!window.KanjiCanvas) return;
    try {
      const strokes = window.KanjiCanvas[`recordedPattern_${canvasId}`];
      const count = strokes ? strokes.length : 0;
      setStrokeCount(count);

      if (count === 0) {
        setCandidates([]);
        return;
      }

      const raw = window.KanjiCanvas.recognize(canvasId);
      if (raw && typeof raw === 'string') {
        const list = raw.trim().split(/\s+/).filter(Boolean);
        setCandidates(list);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Recognition error:', err);
    }
  }, [canvasId]);

  // Load scripts
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    async function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Không thể nạp file ${src}`));
        document.body.appendChild(s);
      });
    }

    async function initScripts() {
      setLoading(true);
      setLoadError(null);

      try {
        if (!window.KanjiCanvas) {
          await loadScript('/kanji-canvas.js');
        }
        if (!window.KanjiCanvas?.refPatterns?.length) {
          await loadScript('/ref-patterns.js');
        }

        if (isMounted) {
          setIsReady(true);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Lỗi tải mô hình chữ viết tay';
          setLoadError(msg);
          setLoading(false);
        }
      }
    }

    initScripts();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Initialize canvas once scripts and DOM element are ready
  useEffect(() => {
    if (!visible || !isReady) return;

    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvasEl || !window.KanjiCanvas) return;

    window.KanjiCanvas.init(canvasId);
    if (window.KanjiCanvas.strokeColors) {
      window.KanjiCanvas.strokeColors = new Array(60).fill('#1E1E1E');
    }

    // Auto-recognize on mouseup or touchend
    const handleStrokeEnd = () => {
      setTimeout(runRecognition, 50);
    };

    canvasEl.addEventListener('mouseup', handleStrokeEnd);
    canvasEl.addEventListener('touchend', handleStrokeEnd);

    return () => {
      canvasEl.removeEventListener('mouseup', handleStrokeEnd);
      canvasEl.removeEventListener('touchend', handleStrokeEnd);
    };
  }, [visible, isReady, canvasId, runRecognition]);

  const handleDeleteLast = () => {
    if (!window.KanjiCanvas) return;
    window.KanjiCanvas.deleteLast(canvasId);
    runRecognition();
  };

  const handleClearAll = () => {
    if (!window.KanjiCanvas) return;
    window.KanjiCanvas.erase(canvasId);
    setCandidates([]);
    setStrokeCount(0);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nhận diện Kanji viết tay</Text>
              <Text style={styles.subtitle}>
                Vẽ chữ Hán vào khung dưới, AI tự động gợi ý chữ tương ứng
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Canvas Box */}
          <View style={styles.canvasContainer}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={nihongoTheme.colors.accent} />
                <Text style={styles.loadingText}>Đang nạp dữ liệu nhận diện Kanji...</Text>
              </View>
            ) : loadError ? (
              <View style={styles.loadingBox}>
                <View style={styles.errorRow}>
                  <AlertCircleIcon size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{loadError}</Text>
                </View>
              </View>
            ) : null}

            <div
              style={{
                display: loading || loadError ? 'none' : 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <canvas
                id={canvasId}
                data-stroke-numbers="false"
                width={280}
                height={280}
                style={{
                  width: '280px',
                  height: '280px',
                  backgroundColor: '#FFFDF9',
                  border: `2px solid ${nihongoTheme.colors.borderWarm}`,
                  borderRadius: '16px',
                  cursor: 'crosshair',
                  touchAction: 'none',
                  backgroundImage: `
                    linear-gradient(to right, transparent 49.5%, #EBE4DC 49.5%, #EBE4DC 50.5%, transparent 50.5%),
                    linear-gradient(to bottom, transparent 49.5%, #EBE4DC 49.5%, #EBE4DC 50.5%, transparent 50.5%)
                  `,
                }}
              />
              {strokeCount === 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    color: '#8A8078',
                    backgroundColor: 'rgba(255, 253, 249, 0.94)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Vẽ chữ vào đây
                </div>
              ) : null}
            </div>
          </View>

          {/* Controls toolbar */}
          <View style={styles.toolbar}>
            <Pressable
              style={[styles.toolBtn, strokeCount === 0 && styles.toolBtnDisabled]}
              onPress={handleDeleteLast}
              disabled={strokeCount === 0}
            >
              <View style={styles.toolBtnInner}>
                <UndoIcon size={15} color={nihongoTheme.colors.textPrimary} />
                <Text style={styles.toolBtnText}>Lùi 1 nét</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.toolBtn, strokeCount === 0 && styles.toolBtnDisabled]}
              onPress={handleClearAll}
              disabled={strokeCount === 0}
            >
              <View style={styles.toolBtnInner}>
                <TrashIcon size={15} color={nihongoTheme.colors.textPrimary} />
                <Text style={styles.toolBtnText}>Xóa hết</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.toolBtn, styles.recognizeBtn]}
              onPress={runRecognition}
            >
              <View style={styles.toolBtnInner}>
                <SearchNavIcon size={15} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.recognizeBtnText}>Nhận diện</Text>
              </View>
            </Pressable>
          </View>

          {/* Candidate suggestions */}
          <View style={styles.candidatesSection}>
            <Text style={styles.candidatesTitle}>
              {candidates.length > 0
                ? 'Gợi ý Hán tự (chạm để chọn):'
                : strokeCount > 0
                ? 'Đang nhận diện...'
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
    minHeight: 280,
  },
  loadingBox: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  toolBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
