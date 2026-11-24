import React, { useState, useRef, useCallback } from 'react';
import {
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
import { fetchTranscriptApi, parseYouTubeVideoId } from '../../../src/features/shadowing/shadowing-api';
import type { AnalyzedToken, ShadowingLine, SampleVideoItem } from '../../../src/features/shadowing/types';

export default function ListeningScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  // Screen mode: 'catalog' shows the list of videos + custom link input; 'player' shows the shadowing workspace
  const [screenMode, setScreenMode] = useState<'catalog' | 'player'>('catalog');

  const [catalogVideos, setCatalogVideos] = useState<SampleVideoItem[]>(SAMPLE_VIDEOS);
  const [currentVideo, setCurrentVideo] = useState<SampleVideoItem>(SAMPLE_VIDEOS[0]);

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

  const playerRef = useRef<PlayerRef>(null);
  const lastPausedLineRef = useRef<number>(-1);

  // Sync subtitle index from current video time
  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!lines || lines.length === 0) return;

      let foundIdx = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (currentTime >= lines[i].start) {
          foundIdx = i;
          break;
        }
      }

      setCurrentIndex((prev) => (prev !== foundIdx ? foundIdx : prev));

      const curLine = lines[foundIdx];
      if (!curLine) return;

      const lineEnd = curLine.start + curLine.duration;

      // Loop current line feature
      if (isLooping && currentTime >= lineEnd - 0.15) {
        playerRef.current?.seekTo(curLine.start);
        return;
      }

      // Auto-pause at end of current line (Shadowing training mode)
      if (autoPause && currentTime >= lineEnd - 0.2) {
        if (lastPausedLineRef.current !== foundIdx) {
          lastPausedLineRef.current = foundIdx;
          playerRef.current?.pause();
          setIsPlaying(false);
        }
      }
    },
    [lines, isLooping, autoPause],
  );

  const handlePlayerState = (state: number) => {
    // 1 = playing, 2 = paused
    if (state === 1) setIsPlaying(true);
    if (state === 2) setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  };

  const handleSeekRelative = (seconds: number) => {
    const cur = playerRef.current?.getCurrentTime() || 0;
    const target = Math.max(0, cur + seconds);
    playerRef.current?.seekTo(target);
  };

  const handleSelectLine = (index: number) => {
    if (index >= 0 && index < lines.length) {
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
      const newVideo: SampleVideoItem = {
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
        channel: 'YouTube',
      };
      setCatalogVideos((prev) => [newVideo, ...prev]);
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
      const newVideo: SampleVideoItem = {
        videoId: extractedId,
        title: `YouTube Video (${extractedId})`,
        channel: 'YouTube',
      };

      setCatalogVideos((prev) => [newVideo, ...prev]);
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
            subtitle="Chọn video luyện tập hoặc dán link YouTube bất kỳ để bắt đầu"
          />

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
            subtitle={videoTitle}
            onBack={handleBackToCatalog}
          />

          {/* Player Navigation / Header Bar */}
          <View style={styles.playerTopBar}>
            <Pressable style={styles.backButton} onPress={handleBackToCatalog}>
              <Text style={styles.backButtonText}>← Đổi video khác</Text>
            </Pressable>

            <View style={styles.playerVideoMeta}>
              <Text style={styles.playerVideoTitle} numberOfLines={1}>
                {videoTitle}
              </Text>
              {currentVideo.channel ? (
                <Text style={styles.playerVideoChannel} numberOfLines={1}>
                  🎙️ {currentVideo.channel}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Main Layout: 2 Columns on Desktop, 1 Column on Mobile */}
          <View style={[styles.mainLayout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
            {/* Left Column: Player + Toolbar + Current Sentence View */}
            <View style={styles.leftColumn}>
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
                onSelectToken={(token) => setSelectedToken(token)}
                onReplayLine={handleReplayCurrentLine}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping((prev) => !prev)}
              />
            </View>

            {/* Right Column: Transcript Subtitles List */}
            <View style={styles.rightColumn}>
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
    flex: 1.25,
    gap: 14,
  },
  rightColumn: {
    flex: 0.95,
  },
});
