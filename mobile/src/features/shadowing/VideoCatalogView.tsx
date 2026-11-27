import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { SampleVideoItem } from './types';

interface VideoCatalogViewProps {
  videos: SampleVideoItem[];
  onSelectVideo: (video: SampleVideoItem) => void;
  onSubmitUrl?: (url: string) => void;
  isLoading: boolean;
  loadingVideoId: string | null;
  errorMessage: string | null;
}

export function VideoCatalogView({
  videos,
  onSelectVideo,
  onSubmitUrl,
  isLoading,
  loadingVideoId,
  errorMessage,
}: VideoCatalogViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;
  const [urlInput, setUrlInput] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);

  const handleSubmit = () => {
    if (urlInput.trim() && onSubmitUrl) {
      onSubmitUrl(urlInput.trim());
    }
  };

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      ) : null}

      {/* Curated Sample Videos Catalog Section */}
      <View style={styles.catalogSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Video có sẵn</Text>
          <Pressable
            style={styles.ytbButton}
            onPress={() => setUrlOpen((prev) => !prev)}
          >
            <Text style={styles.ytbButtonText}>
              {urlOpen ? '✕ Thu gọn' : '+ Link YouTube'}
            </Text>
          </Pressable>
        </View>

        {urlOpen ? (
          <View style={styles.inputRow}>
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              onSubmitEditing={handleSubmit}
              placeholder="Dán URL YouTube..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Pressable
              style={[styles.submitButton, (!urlInput.trim() || isLoading) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!urlInput.trim() || isLoading}
            >
              {isLoading && loadingVideoId === 'custom' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Bắt đầu học ▶</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          {videos.map((video) => {
            const isThisLoading = isLoading && loadingVideoId === video.videoId;

            return (
              <Pressable
                key={video.videoId}
                style={[styles.videoCard, isDesktop && styles.videoCardDesktop]}
                onPress={() => onSelectVideo(video)}
                disabled={isLoading}
              >
                {/* Thumbnail Container */}
                <View style={styles.thumbWrapper}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg` }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  {video.duration ? (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{video.duration}</Text>
                    </View>
                  ) : null}

                  {/* Play Overlay */}
                  <View style={styles.playOverlay}>
                    {isThisLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="large" />
                    ) : (
                      <View style={styles.playButtonCircle}>
                        <Text style={styles.playIconText}>▶</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Video Info */}
                <View style={styles.videoInfo}>
                  <View style={styles.badgeRow}>
                    {video.level ? (
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{video.level}</Text>
                      </View>
                    ) : null}
                    <View style={styles.onlineBadge}>
                      <Text style={styles.onlineBadgeText}>🎬 YouTube Shadowing</Text>
                    </View>
                  </View>

                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>

                  {video.channel ? (
                    <Text style={styles.channelName} numberOfLines={1}>
                      🎙️ {video.channel}
                    </Text>
                  ) : null}

                  {video.description ? (
                    <Text style={styles.videoDesc} numberOfLines={2}>
                      {video.description}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.ctaText}>
                      {isThisLoading ? 'Đang trích xuất phụ đề…' : 'Bắt đầu luyện tập ▶'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 24,
  },
  inputCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    fontSize: 26,
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  chevronText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
    paddingLeft: 8,
    paddingTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
  },
  submitButton: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: nihongoTheme.colors.accentDisabled,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  catalogSection: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ytbButton: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.accent,
  },
  ytbButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: nihongoTheme.colors.textMuted,
  },
  sectionDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  videoCardDesktop: {
    width: '48.5%',
  },
  thumbWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(244, 138, 52, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  playIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  videoInfo: {
    padding: 16,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  offlineBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.successText,
  },
  onlineBadge: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 21,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  videoDesc: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    lineHeight: 17,
  },
  cardFooter: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    alignItems: 'flex-end',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.accent,
  },
});
