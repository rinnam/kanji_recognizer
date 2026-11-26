import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  TextInput,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { ShadowingPlayer, type PlayerRef } from '../../../src/features/shadowing/ShadowingPlayer';
import { CurrentSentenceView } from '../../../src/features/shadowing/CurrentSentenceView';
import { TranscriptListView } from '../../../src/features/shadowing/TranscriptListView';
import { ShadowingToolbar } from '../../../src/features/shadowing/ShadowingToolbar';
import { WordDetailModal } from '../../../src/features/shadowing/WordDetailModal';
import { VideoCatalogView } from '../../../src/features/shadowing/VideoCatalogView';
import { SAMPLE_VIDEOS } from '../../../src/features/shadowing/sample-videos';
import {
  readShadowingLibrary,
  saveShadowingLibrary,
  type SavedVideoItem,
  type VideoFolder,
} from '../../../src/features/shadowing/video-library-store';
import { fetchTranscriptApi, parseYouTubeVideoId } from '../../../src/features/shadowing/shadowing-api';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import type { AnalyzedToken, ShadowingLine, SampleVideoItem } from '../../../src/features/shadowing/types';

export default function ListeningScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  // Screen mode: 'catalog' shows the list of videos + custom link input; 'player' shows the shadowing workspace
  const [screenMode, setScreenMode] = useState<'catalog' | 'player'>('catalog');

  const [videoFolders, setVideoFolders] = useState<VideoFolder[]>([]);
  const [customVideos, setCustomVideos] = useState<SavedVideoItem[]>([]);
  const [selectedVideoFolderId, setSelectedVideoFolderId] = useState<string | null>(null);
  const [newVideoFolderName, setNewVideoFolderName] = useState<string>('');
  const [currentVideo, setCurrentVideo] = useState<SampleVideoItem>(SAMPLE_VIDEOS[0]);

  useEffect(() => {
    void readShadowingLibrary().then((data) => {
      setVideoFolders(data.folders);
      setCustomVideos(data.customVideos);
    });
  }, []);

  const catalogVideos = useMemo<SavedVideoItem[]>(() => {
    const merged: SavedVideoItem[] = [...customVideos, ...SAMPLE_VIDEOS];
    if (!selectedVideoFolderId) return merged;
    return merged.filter((v) => v.folderId === selectedVideoFolderId);
  }, [customVideos, selectedVideoFolderId]);

  const persistLibrary = (nextFolders: VideoFolder[], nextVideos: SavedVideoItem[]) => {
    setVideoFolders(nextFolders);
    setCustomVideos(nextVideos);
    void saveShadowingLibrary({ folders: nextFolders, customVideos: nextVideos });
  };

  const handleCreateVideoFolder = () => {
    const name = newVideoFolderName.trim();
    if (!name) return;
    const created: VideoFolder = { id: `vfolder_${Date.now()}`, name };
    persistLibrary([...videoFolders, created], customVideos);
    setNewVideoFolderName('');
    setSelectedVideoFolderId(created.id);
  };

  // In-memory cache for fetched transcript lines to avoid re-fetching the same video within the same session
  const linesCacheRef = useRef<Record<string, ShadowingLine[]>>({});

  const [videoId, setVideoId] = useState<string>(SAMPLE_VIDEOS[0].videoId);
  const [videoTitle, setVideoTitle] = useState<string>(SAMPLE_VIDEOS[0].title);
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
      setCurrentVideo(video);
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
      setCurrentVideo(video);
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

  // User submits a custom YouTube link
  const handleCustomUrlSubmit = async (url: string) => {
    const extractedId = parseYouTubeVideoId(url);
    if (!extractedId) {
      setErrorMessage('Link YouTube không hợp lệ. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }

    setErrorMessage(null);

    // Check if it's already one of our catalog videos
    const matched = catalogVideos.find((v) => v.videoId === extractedId);
    if (matched) {
      handleSelectCatalogVideo(matched);
      return;
    }

    // Check session cache
    if (linesCacheRef.current[extractedId]) {
      const cached = linesCacheRef.current[extractedId];
      const newVideo: SavedVideoItem = {
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
        channel: 'YouTube (Đã lưu)',
        folderId: selectedVideoFolderId,
        isCustom: true,
      };
      const nextCustom = [newVideo, ...customVideos.filter((v) => v.videoId !== extractedId)];
      persistLibrary(videoFolders, nextCustom);
      setCurrentVideo(newVideo);
      setVideoId(extractedId);
      setVideoTitle(newVideo.title);
      setLines(cached);
      setCurrentIndex(0);
      lastPausedLineRef.current = -1;
      setScreenMode('player');
      return;
    }

    setLoading(true);
    setLoadingVideoId('custom');
    try {
      const res = await fetchTranscriptApi(extractedId);
      if (!res.lines || res.lines.length === 0) {
        throw new Error('Video này không có phụ đề tiếng Nhật. Vui lòng chọn video có CC tiếng Nhật.');
      }

      linesCacheRef.current[extractedId] = res.lines;
      const newVideo: SavedVideoItem = {
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
        channel: 'YouTube (Đã lưu)',
        folderId: selectedVideoFolderId,
        isCustom: true,
      };

      const nextCustom = [newVideo, ...customVideos.filter((v) => v.videoId !== extractedId)];
      persistLibrary(videoFolders, nextCustom);
      setCurrentVideo(newVideo);
      setVideoId(extractedId);
      setVideoTitle(newVideo.title);
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

  const handleBackToCatalog = () => {
    playerRef.current?.pause();
    setIsPlaying(false);
    setScreenMode('catalog');
  };

  const currentLine = lines[currentIndex] || null;

  return (
    <AppShell>
      {screenMode === 'catalog' ? (
        <>
          <TopHeader
            mode="subpage"
            title="Luyện nghe & Shadowing"
            subtitle="Chọn video luyện tập hoặc dán link YouTube bất kỳ để lưu vào thư mục"
          />

          {/* Video Folder Filter & Quick Create Bar */}
          <View style={styles.folderStrip}>
            <View style={styles.folderChips}>
              <Pressable
                style={[styles.folderChip, selectedVideoFolderId === null && styles.folderChipActive]}
                onPress={() => setSelectedVideoFolderId(null)}
              >
                <Text style={[styles.folderChipText, selectedVideoFolderId === null && styles.folderChipTextActive]}>
                  Tất cả ({customVideos.length + SAMPLE_VIDEOS.length})
                </Text>
              </Pressable>
              {videoFolders.map((f) => {
                const active = selectedVideoFolderId === f.id;
                const count = customVideos.filter((v) => v.folderId === f.id).length;
                return (
                  <Pressable
                    key={f.id}
                    style={[styles.folderChip, active && styles.folderChipActive]}
                    onPress={() => setSelectedVideoFolderId(f.id)}
                  >
                    <Text style={[styles.folderChipText, active && styles.folderChipTextActive]}>
                      {f.name} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.folderCreateRow}>
              <TextInput
                value={newVideoFolderName}
                onChangeText={setNewVideoFolderName}
                onSubmitEditing={handleCreateVideoFolder}
                placeholder="Tạo thư mục video mới..."
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.pickerInput}
              />
              <Pressable style={styles.pickerAddBtn} onPress={handleCreateVideoFolder}>
                <Text style={styles.pickerAddText}>+ Tạo</Text>
              </Pressable>
            </View>
          </View>

          <VideoCatalogView
            videos={catalogVideos}
            onSelectVideo={handleSelectCatalogVideo}
            onSubmitUrl={handleCustomUrlSubmit}
            isLoading={loading}
            loadingVideoId={loadingVideoId}
            errorMessage={errorMessage}
          />
        </>
      ) : (
        <>
          <TopHeader
            mode="subpage"
            title="Luyện nghe & Shadowing"
            subtitle={currentVideo.channel ? `${videoTitle} · ${currentVideo.channel}` : videoTitle}
            onBack={handleBackToCatalog}
            rightSlot={
              <Pressable style={styles.backButton} onPress={() => setVideoPickerOpen(true)}>
                <Text style={styles.backButtonText}>Đổi video ▾</Text>
              </Pressable>
            }
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

          {/* Main Layout: 2 Columns on Desktop, 1 Column on Mobile */}
          <View style={[styles.mainLayout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
            {/* Left Column: Player + Toolbar + Current Sentence View */}
            <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
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
                onSeekRelative={handleSeekRelative}
                speed={speed}
                onChangeSpeed={handleChangeSpeed}
                autoPause={autoPause}
                onToggleAutoPause={() => setAutoPause((prev) => !prev)}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping((prev) => !prev)}
              />

              <CurrentSentenceView
                line={currentLine}
                onSelectToken={(token) => {
                  recordMeaningfulStudyAction('listening_token');
                  setSelectedToken(token);
                }}
                onReplayLine={() => {
                  recordMeaningfulStudyAction('listening_replay');
                  handleReplayCurrentLine();
                }}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping((prev) => !prev)}
              />
            </View>

            {/* Right Column: Transcript Subtitles List */}
            <View style={isDesktop ? styles.rightColumnDesktop : undefined}>
              <TranscriptListView
                lines={lines}
                activeIndex={currentIndex}
                onSelectLine={handleSelectLine}
              />
            </View>
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
    flex: 1.25,
  },
  rightColumnDesktop: {
    flex: 0.95,
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
  folderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
});
