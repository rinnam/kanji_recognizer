import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { ShadowingPlayer, type PlayerRef } from '../../../src/features/shadowing/ShadowingPlayer';
import { CurrentSentenceView } from '../../../src/features/shadowing/CurrentSentenceView';
import { TranscriptListView } from '../../../src/features/shadowing/TranscriptListView';
import { ShadowingToolbar } from '../../../src/features/shadowing/ShadowingToolbar';
import { WordDetailModal } from '../../../src/features/shadowing/WordDetailModal';
import { VideoCatalogView } from '../../../src/features/shadowing/VideoCatalogView';
import {
  deleteMyShadowingVideoApi,
  fetchShadowingCatalog,
  saveMyShadowingVideoApi,
} from '../../../src/features/shadowing/video-library-store';
import { fetchTranscriptApi, parseYouTubeVideoId } from '../../../src/features/shadowing/shadowing-api';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import type { AnalyzedToken, ShadowingLine, SampleVideoItem } from '../../../src/features/shadowing/types';

export default function ListeningScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  // Screen mode: 'catalog' shows the list of videos + custom link input; 'player' shows the shadowing workspace
  const [screenMode, setScreenMode] = useState<'catalog' | 'player'>('catalog');

  const [activeScope, setActiveScope] = useState<'all' | 'mine'>('all');
  const [adminVideos, setAdminVideos] = useState<SampleVideoItem[]>([]);
  const [myVideos, setMyVideos] = useState<SampleVideoItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<SampleVideoItem | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await fetchShadowingCatalog();
      setAdminVideos(data.adminVideos);
      setMyVideos(data.myVideos);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  const allVideos = useMemo<SampleVideoItem[]>(() => {
    const myIds = new Set(myVideos.map((v) => v.videoId));
    const filteredAdmin = adminVideos.filter((v) => !myIds.has(v.videoId));
    return [...myVideos, ...filteredAdmin];
  }, [myVideos, adminVideos]);

  const catalogVideos = useMemo<SampleVideoItem[]>(() => {
    return activeScope === 'mine' ? myVideos : allVideos;
  }, [activeScope, myVideos, allVideos]);

  // In-memory cache for fetched transcript lines to avoid re-fetching the same video within the same session
  const linesCacheRef = useRef<Record<string, ShadowingLine[]>>({});

  const [videoId, setVideoId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [lines, setLines] = useState<ShadowingLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<AnalyzedToken | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [autoPause, setAutoPause] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoPickerOpen, setVideoPickerOpen] = useState<boolean>(false);
  const [desktopTranscriptOpen, setDesktopTranscriptOpen] = useState<boolean>(true);
  const [mobileTranscriptOpen, setMobileTranscriptOpen] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [quickUrl, setQuickUrl] = useState<string>('');

  const playerRef = useRef<PlayerRef>(null);
  const lastPausedLineRef = useRef<number>(-1);
  const linesRef = useRef(lines);
  const isLoopingRef = useRef(isLooping);
  const autoPauseRef = useRef(autoPause);
  const currentIndexRef = useRef(currentIndex);

  linesRef.current = lines;
  isLoopingRef.current = isLooping;
  autoPauseRef.current = autoPause;
  currentIndexRef.current = currentIndex;

  // Sync subtitle index from current video time (ref-backed to avoid stale player closures)
  const handleTimeUpdate = useCallback((currentTime: number) => {
    const activeLines = linesRef.current;
    if (!activeLines || activeLines.length === 0) return;

    const getEffectiveEnd = (idx: number) => {
      const line = activeLines[idx];
      const next = activeLines[idx + 1];
      const rawEnd = line.start + Math.max(line.duration, 0.5);
      return next ? Math.min(rawEnd, next.start) : rawEnd;
    };

    // 1) If Looping is ON, lock strictly to currentIndexRef and seek back at effectiveEnd
    if (isLoopingRef.current) {
      const lockedIdx = Math.min(Math.max(currentIndexRef.current, 0), activeLines.length - 1);
      const lockedLine = activeLines[lockedIdx];
      const lockedEnd = getEffectiveEnd(lockedIdx);
      if (currentTime >= lockedEnd - 0.15) {
        playerRef.current?.seekTo(lockedLine.start);
        return;
      }
      return;
    }

    // 2) If Auto-Pause is ON, pause as soon as the current line reaches its effectiveEnd
    if (autoPauseRef.current) {
      const activeIdx = Math.min(Math.max(currentIndexRef.current, 0), activeLines.length - 1);
      const activeEnd = getEffectiveEnd(activeIdx);
      if (currentTime >= activeEnd - 0.15 && lastPausedLineRef.current !== activeIdx) {
        lastPausedLineRef.current = activeIdx;
        playerRef.current?.pause();
        setIsPlaying(false);
        return;
      }
    }

    let foundIdx = 0;
    for (let i = activeLines.length - 1; i >= 0; i--) {
      if (currentTime >= activeLines[i].start) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx !== currentIndexRef.current) {
      currentIndexRef.current = foundIdx;
      setCurrentIndex(foundIdx);
    }
  }, []);

  const handlePlayerState = (state: number) => {
    // 1 = playing, 2 = paused
    if (state === 1) setIsPlaying(true);
    if (state === 2) setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    recordMeaningfulStudyAction('listening_play_toggle');
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  };

  const handleSeekRelative = (seconds: number) => {
    recordMeaningfulStudyAction('listening_seek');
    const cur = playerRef.current?.getCurrentTime() || 0;
    const target = Math.max(0, cur + seconds);
    playerRef.current?.seekTo(target);
  };

  const handleSelectLine = (index: number) => {
    if (index >= 0 && index < lines.length) {
      recordMeaningfulStudyAction('listening_select_line');
      setCurrentIndex(index);
      lastPausedLineRef.current = -1;
      playerRef.current?.seekTo(lines[index].start);
    }
  };

  const handlePrevLine = () => {
    if (currentIndex > 0) {
      handleSelectLine(currentIndex - 1);
    }
  };

  const handleNextLine = () => {
    if (currentIndex < lines.length - 1) {
      handleSelectLine(currentIndex + 1);
    }
  };

  const handleReplayCurrentLine = () => {
    if (lines[currentIndex]) {
      lastPausedLineRef.current = -1;
      playerRef.current?.seekTo(lines[currentIndex].start);
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleChangeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    playerRef.current?.setRate(newSpeed);
  };

  // User selects a curated video from the catalog
  const handleSelectCatalogVideo = async (video: SampleVideoItem) => {
    setErrorMessage(null);

    // If lines are already cached in current session
    if (linesCacheRef.current[video.videoId]) {
      const cached = linesCacheRef.current[video.videoId];
      setVideoId(video.videoId);
      setVideoTitle(video.title);
      setLines(cached);
      setCurrentIndex(0);
      lastPausedLineRef.current = -1;
      setScreenMode('player');
      return;
    }

    // Fetch transcript on-demand from backend API
    setLoading(true);
    setLoadingVideoId(video.videoId);
    try {
      const res = await fetchTranscriptApi(video.videoId);
      if (!res.lines || res.lines.length === 0) {
        throw new Error('Video này không có phụ đề tiếng Nhật để luyện Shadowing.');
      }

      linesCacheRef.current[video.videoId] = res.lines;
      setVideoId(video.videoId);
      setVideoTitle(video.title);
      setLines(res.lines);
      setCurrentIndex(0);
      lastPausedLineRef.current = -1;
      setScreenMode('player');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tải được phụ đề của video này.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setLoadingVideoId(null);
    }
  };

  // User submits a custom YouTube link -> saves to "Video của tôi" in DB & opens player
  const handleCustomUrlSubmit = async (url: string) => {
    const extractedId = parseYouTubeVideoId(url);
    if (!extractedId) {
      setErrorMessage('Link YouTube không hợp lệ. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setLoadingVideoId('custom');

    let savedVideo: SampleVideoItem | null = null;
    try {
      const existingMine = myVideos.find((v) => v.videoId === extractedId);
      if (existingMine) {
        savedVideo = existingMine;
      } else {
        try {
          const savedRes = await saveMyShadowingVideoApi({ urlOrId: url });
          savedVideo = savedRes.video;
          setMyVideos((prev) => [
            savedRes.video,
            ...prev.filter((v) => v.videoId !== savedRes.video.videoId),
          ]);
        } catch {
          // If unauthenticated or temporary save failure, continue transcript playback gracefully
          savedVideo = {
            videoId: extractedId,
            title: `YouTube Video (${extractedId})`,
            channel: 'YouTube (Đã lưu)',
            source: 'user',
          };
        }
      }

      if (linesCacheRef.current[extractedId]) {
        const cached = linesCacheRef.current[extractedId];
        setVideoId(extractedId);
        setVideoTitle(savedVideo.title);
        setLines(cached);
        setCurrentIndex(0);
        lastPausedLineRef.current = -1;
        setScreenMode('player');
        return;
      }

      const res = await fetchTranscriptApi(extractedId);
      if (!res.lines || res.lines.length === 0) {
        throw new Error('Đã lưu vào Video của tôi, nhưng video này không có phụ đề tiếng Nhật (CC) để luyện Shadowing.');
      }

      linesCacheRef.current[extractedId] = res.lines;
      setVideoId(extractedId);
      setVideoTitle(savedVideo.title);
      setLines(res.lines);
      setCurrentIndex(0);
      lastPausedLineRef.current = -1;
      setScreenMode('player');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tải được phụ đề';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setLoadingVideoId(null);
    }
  };

  const handleConfirmDeleteMyVideo = async () => {
    if (!deleteConfirmVideo || deletingVideoId) return;
    const target = deleteConfirmVideo;
    setDeletingVideoId(target.videoId);
    setErrorMessage(null);
    try {
      await deleteMyShadowingVideoApi(target.videoId);
      setMyVideos((prev) => prev.filter((v) => v.videoId !== target.videoId));
      setDeleteConfirmVideo(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Không xóa được video.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleBackToCatalog = () => {
    playerRef.current?.pause();
    setIsPlaying(false);
    setScreenMode('catalog');
  };

  const currentLine = lines[currentIndex] || null;

  return (
    <AppShell
      scroll={screenMode === 'catalog' || !isDesktop}
      contentStyle={
        isDesktop && screenMode === 'player'
          ? { maxWidth: 1340, paddingTop: 18, paddingHorizontal: 32, paddingBottom: 16 }
          : undefined
      }
    >
      {screenMode === 'catalog' ? (
        <>
          <TopHeader
            mode="subpage"
            title="Luyện nghe & Shadowing"
          />

          {/* Strictly 2 tabs: Tất cả (Admin + User) & Video của tôi */}
          <View style={styles.folderStrip}>
            <View style={styles.folderChips}>
              <Pressable
                style={[styles.folderChip, activeScope === 'all' && styles.folderChipActive]}
                onPress={() => setActiveScope('all')}
              >
                <Text style={[styles.folderChipText, activeScope === 'all' && styles.folderChipTextActive]}>
                  Tất cả ({allVideos.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.folderChip, activeScope === 'mine' && styles.folderChipActive]}
                onPress={() => setActiveScope('mine')}
              >
                <Text style={[styles.folderChipText, activeScope === 'mine' && styles.folderChipTextActive]}>
                  Video của tôi ({myVideos.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {catalogLoading && allVideos.length === 0 ? (
            <View style={styles.catalogLoadingCard}>
              <ActivityIndicator color={nihongoTheme.colors.accent} />
              <Text style={styles.pickerItemChannel}>Đang tải danh sách video...</Text>
            </View>
          ) : (
            <VideoCatalogView
              videos={catalogVideos}
              activeScope={activeScope}
              onSelectVideo={(v) => void handleSelectCatalogVideo(v)}
              onSubmitUrl={(url) => void handleCustomUrlSubmit(url)}
              onDeleteVideo={(video) => setDeleteConfirmVideo(video)}
              isLoading={loading}
              loadingVideoId={loadingVideoId}
              deletingVideoId={deletingVideoId}
              errorMessage={errorMessage}
            />
          )}

          <Modal
            visible={Boolean(deleteConfirmVideo)}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!deletingVideoId) setDeleteConfirmVideo(null);
            }}
          >
            <View style={styles.deleteOverlay}>
              <View style={styles.deleteCard}>
                <Text style={styles.pickerTitle}>Xóa video khỏi &ldquo;Video của tôi&rdquo;?</Text>
                <Text style={styles.pickerItemChannel}>
                  {deleteConfirmVideo
                    ? `Video "${deleteConfirmVideo.title}" sẽ bị xóa khỏi danh sách đã lưu của bạn.`
                    : ''}
                </Text>
                <View style={styles.deleteActionsRow}>
                  <Pressable
                    style={styles.cancelDeleteBtn}
                    disabled={Boolean(deletingVideoId)}
                    onPress={() => setDeleteConfirmVideo(null)}
                  >
                    <Text style={styles.cancelDeleteText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDeleteBtn}
                    disabled={Boolean(deletingVideoId)}
                    onPress={() => void handleConfirmDeleteMyVideo()}
                  >
                    <Text style={styles.confirmDeleteText}>
                      {deletingVideoId ? 'Đang xóa...' : 'Xóa video'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <TopHeader
            mode="subpage"
            title="Luyện nghe & Shadowing"
            onBack={handleBackToCatalog}
          />

          {/* In-place Video Switcher Modal */}
          <Modal
            visible={videoPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setVideoPickerOpen(false)}
          >
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn video luyện nghe</Text>
                  <Pressable onPress={() => setVideoPickerOpen(false)}>
                    <Text style={styles.pickerClose}>Đóng</Text>
                  </Pressable>
                </View>

                <View style={styles.pickerUrlRow}>
                  <TextInput
                    value={quickUrl}
                    onChangeText={setQuickUrl}
                    placeholder="Dán link YouTube khác..."
                    placeholderTextColor={nihongoTheme.colors.textMuted}
                    style={styles.pickerInput}
                  />
                  <Pressable
                    style={styles.pickerAddBtn}
                    onPress={() => {
                      if (!quickUrl.trim()) return;
                      const url = quickUrl.trim();
                      setQuickUrl('');
                      setVideoPickerOpen(false);
                      void handleCustomUrlSubmit(url);
                    }}
                  >
                    <Text style={styles.pickerAddText}>Mở</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.pickerList} showsVerticalScrollIndicator>
                  {catalogVideos.map((v) => {
                    const active = v.videoId === videoId;
                    return (
                      <Pressable
                        key={v.videoId}
                        style={[styles.pickerItem, active && styles.pickerItemActive]}
                        onPress={() => {
                          setVideoPickerOpen(false);
                          void handleSelectCatalogVideo(v);
                        }}
                      >
                        <Text style={[styles.pickerItemTitle, active && styles.pickerItemTitleActive]} numberOfLines={2}>
                          {v.title}
                        </Text>
                        {v.channel ? <Text style={styles.pickerItemChannel}>{v.channel}</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Main Layout: Sticky Video + Toolbar, Right Column Transcript on Desktop, Modal on Mobile */}
          <View
            style={[
              styles.mobilePlayerRoot,
              isDesktop && !desktopTranscriptOpen && styles.desktopPlayerContainer,
              isDesktop && desktopTranscriptOpen && styles.desktopSplitRow,
            ]}
          >
            <View style={[styles.mobilePlayerRoot, isDesktop && desktopTranscriptOpen && styles.leftColumnDesktop]}>
              {isDesktop ? (
                <ScrollView
                  style={styles.mobileBodyScroll}
                  contentContainerStyle={styles.leftColumnScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  <ShadowingPlayer
                    ref={playerRef}
                    videoId={videoId}
                    onTimeUpdate={handleTimeUpdate}
                    onStateChange={handlePlayerState}
                  />

                  <ShadowingToolbar
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    onPrevLine={handlePrevLine}
                    onNextLine={handleNextLine}
                    speed={speed}
                    onChangeSpeed={handleChangeSpeed}
                    autoPause={autoPause}
                    onToggleAutoPause={() => setAutoPause((prev) => !prev)}
                    showTranslation={showTranslation}
                    onToggleTranslation={() => setShowTranslation((prev) => !prev)}
                    transcriptOpen={desktopTranscriptOpen}
                    onOpenTranscript={() => setDesktopTranscriptOpen((prev) => !prev)}
                  />

                  <CurrentSentenceView
                    showTranslation={showTranslation}
                    line={currentLine}
                    onSelectToken={(token) => {
                      recordMeaningfulStudyAction('listening_token');
                      setSelectedToken(token);
                    }}
                    onReplayLine={() => {
                      recordMeaningfulStudyAction('listening_replay');
                      handleReplayCurrentLine();
                    }}
                    onBeforeSpeak={() => {
                      playerRef.current?.pause();
                      setIsPlaying(false);
                    }}
                    isLooping={isLooping}
                    onToggleLoop={() => setIsLooping((prev) => !prev)}
                  />
                </ScrollView>
              ) : (
                <>
                  <View style={styles.mobileStickyTop}>
                    <ShadowingPlayer
                      ref={playerRef}
                      videoId={videoId}
                      onTimeUpdate={handleTimeUpdate}
                      onStateChange={handlePlayerState}
                    />

                    <ShadowingToolbar
                      isPlaying={isPlaying}
                      onTogglePlay={handleTogglePlay}
                      onPrevLine={handlePrevLine}
                      onNextLine={handleNextLine}
                      speed={speed}
                      onChangeSpeed={handleChangeSpeed}
                      autoPause={autoPause}
                      onToggleAutoPause={() => setAutoPause((prev) => !prev)}
                      showTranslation={showTranslation}
                      onToggleTranslation={() => setShowTranslation((prev) => !prev)}
                      transcriptOpen={mobileTranscriptOpen}
                      onOpenTranscript={() => setMobileTranscriptOpen((prev) => !prev)}
                    />
                  </View>

                  <CurrentSentenceView
                    showTranslation={showTranslation}
                    line={currentLine}
                    onSelectToken={(token) => {
                      recordMeaningfulStudyAction('listening_token');
                      setSelectedToken(token);
                    }}
                    onReplayLine={() => {
                      recordMeaningfulStudyAction('listening_replay');
                      handleReplayCurrentLine();
                    }}
                    onBeforeSpeak={() => {
                      playerRef.current?.pause();
                      setIsPlaying(false);
                    }}
                    isLooping={isLooping}
                    onToggleLoop={() => setIsLooping((prev) => !prev)}
                  />
                </>
              )}
            </View>

            {isDesktop && desktopTranscriptOpen ? (
              <View style={styles.rightColumnDesktop}>
                <TranscriptListView
                  inModal
                  lines={lines}
                  activeIndex={currentIndex}
                  onSelectLine={handleSelectLine}
                />
              </View>
            ) : null}

            {!isDesktop ? (
              <Modal
                visible={mobileTranscriptOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setMobileTranscriptOpen(false)}
              >
                <View style={styles.transcriptOverlay}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setMobileTranscriptOpen(false)} />
                  <View style={styles.transcriptSheet}>
                    <View style={styles.transcriptSheetHeader}>
                      <Text style={styles.pickerTitle}>Phụ đề video ({lines.length})</Text>
                      <Pressable onPress={() => setMobileTranscriptOpen(false)}>
                        <Text style={styles.pickerClose}>Đóng</Text>
                      </Pressable>
                    </View>
                    <TranscriptListView
                      inModal
                      lines={lines}
                      activeIndex={currentIndex}
                      onSelectLine={(idx) => {
                        handleSelectLine(idx);
                        setMobileTranscriptOpen(false);
                      }}
                    />
                  </View>
                </View>
              </Modal>
            ) : null}
          </View>

          {/* Word Detail Popover/Modal */}
          <WordDetailModal
            token={selectedToken}
            onClose={() => setSelectedToken(null)}
          />
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  playerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: nihongoTheme.colors.surface,
    padding: 12,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  backButton: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  backButtonText: {
    color: nihongoTheme.colors.accentHover,
    fontSize: 13,
    fontWeight: '800',
  },
  playerVideoMeta: {
    flex: 1,
  },
  playerVideoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  playerVideoChannel: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    marginTop: 2,
  },
  mainLayout: {
    gap: 16,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  leftColumn: {
    gap: 14,
  },
  leftColumnDesktop: {
    flex: 1.65,
  },
  rightColumnDesktop: {
    flex: 0.85,
    minWidth: 320,
  },
  mobilePlayerRoot: {
    flex: 1,
    gap: 10,
  },
  desktopPlayerContainer: {
    width: '100%',
    maxWidth: 940,
    alignSelf: 'center',
  },
  desktopSplitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  mobileStickyTop: {
    flexShrink: 0,
    gap: 8,
  },
  mobileBodyScroll: {
    flex: 1,
  },
  mobileBodyScrollContent: {
    paddingBottom: 24,
  },
  leftColumnScrollContent: {
    gap: 10,
    paddingBottom: 24,
  },
  transcriptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  transcriptOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  transcriptSheet: {
    backgroundColor: nihongoTheme.colors.bgWarm,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    height: '76%',
    gap: 10,
  },
  transcriptSheetDesktop: {
    width: '100%',
    maxWidth: 620,
    height: '78%',
    borderRadius: 20,
  },
  transcriptSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  folderStrip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    marginBottom: 14,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  folderScroll: {
    flex: 1,
  },
  folderChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  addFolderIconBtn: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFolderIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 20,
  },
  folderChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  folderChipActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  folderChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  folderChipTextActive: {
    color: '#FFFFFF',
  },
  folderCreateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  pickerClose: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  pickerUrlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerInput: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  pickerAddBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pickerAddText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pickerList: {
    maxHeight: 340,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    gap: 2,
  },
  pickerItemActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  pickerItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  pickerItemTitleActive: {
    color: nihongoTheme.colors.accentHover,
  },
  pickerItemChannel: {
    fontSize: 11,
    color: nihongoTheme.colors.textSecondary,
  },
  catalogLoadingCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.dock,
  },
  deleteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.button,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surface,
  },
  cancelDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  confirmDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.button,
    backgroundColor: '#DC2626',
  },
  confirmDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
