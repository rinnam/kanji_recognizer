import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { AlertCircleIcon, MicIcon, TrashIcon } from '../../components/AppIcons';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { SampleVideoItem } from './types';

interface VideoCatalogViewProps {
  videos: SampleVideoItem[];
  activeScope: 'all' | 'mine';
  onSelectVideo: (video: SampleVideoItem) => void;
  onSubmitUrl?: (url: string) => void;
  onDeleteVideo?: (video: SampleVideoItem) => void;
  isLoading: boolean;
  loadingVideoId: string | null;
  deletingVideoId?: string | null;
  errorMessage: string | null;
}

export function VideoCatalogView({
  videos,
  activeScope,
  onSelectVideo,
  onSubmitUrl,
  onDeleteVideo,
  isLoading,
  loadingVideoId,
  deletingVideoId = null,
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
          <View style={styles.errorRow}>
            <AlertCircleIcon size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.catalogSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {activeScope === 'mine' ? 'Video của tôi đã lưu' : 'Video có sẵn'}
          </Text>
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
              placeholder="Dán URL YouTube để lưu vào Video của tôi & học..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Pressable
              style={[
                styles.submitButton,
                (!urlInput.trim() || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!urlInput.trim() || isLoading}
            >
              {isLoading && loadingVideoId === 'custom' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Lưu &amp; Học ▶</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {videos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {activeScope === 'mine'
                ? 'Bạn chưa lưu video YouTube nào'
                : 'Chưa có video Shadowing nào'}
            </Text>
            <Text style={styles.emptyDesc}>
              {activeScope === 'mine'
                ? 'Bấm "+ Link YouTube" ở góc trên bên phải để dán link video tiếng Nhật và lưu tại đây.'
                : 'Quản trị viên chưa đăng video mẫu hoặc bạn có thể tự thêm qua "+ Link YouTube".'}
            </Text>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {videos.map((video) => {
              const isThisLoading = isLoading && loadingVideoId === video.videoId;
              const isDeleting = deletingVideoId === video.videoId;
              const isUserOwned = video.source === 'user';

              return (
                <View
                  key={`${video.source ?? 'admin'}_${video.videoId}`}
                  style={[styles.videoCard, isDesktop && styles.videoCardDesktop]}
                >
                  <Pressable
                    onPress={() => onSelectVideo(video)}
                    disabled={isLoading || isDeleting}
                  >
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

                    <View style={styles.videoInfo}>
                      <View style={styles.badgeRow}>
                        {video.level ? (
                          <View style={styles.levelBadge}>
                            <Text style={styles.levelBadgeText}>{video.level}</Text>
                          </View>
                        ) : null}
                        <View style={isUserOwned ? styles.mineBadge : styles.onlineBadge}>
                          <Text style={isUserOwned ? styles.mineBadgeText : styles.onlineBadgeText}>
                            {isUserOwned ? 'Video của tôi' : 'YouTube Shadowing'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>

                      {video.channel ? (
                        <View style={styles.channelRow}>
                          <MicIcon size={12} color={nihongoTheme.colors.textSecondary} />
                          <Text style={styles.channelName} numberOfLines={1}>
                            {video.channel}
                          </Text>
                        </View>
                      ) : null}

                      {video.description ? (
                        <Text style={styles.videoDesc} numberOfLines={2}>
                          {video.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>

                  <View style={styles.cardFooter}>
                    {isUserOwned && onDeleteVideo ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Xóa video ${video.title}`}
                        style={[styles.deleteBtn, isDeleting && { opacity: 0.5 }]}
                        disabled={isDeleting || isLoading}
                        onPress={() => onDeleteVideo(video)}
                      >
                        <TrashIcon size={13} color="#DC2626" />
                        <Text style={styles.deleteBtnText}>
                          {isDeleting ? 'Đang xóa...' : 'Xóa'}
                        </Text>
                      </Pressable>
                    ) : (
                      <View />
                    )}

                    <Pressable
                      onPress={() => onSelectVideo(video)}
                      disabled={isLoading || isDeleting}
                    >
                      <Text style={styles.ctaText}>
                        {isThisLoading ? 'Đang trích xuất phụ đề…' : 'Bắt đầu luyện tập ▶'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 24,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogSection: {
    gap: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
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
    paddingBottom: 10,
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
  mineBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  mineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
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
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.accent,
  },
});
