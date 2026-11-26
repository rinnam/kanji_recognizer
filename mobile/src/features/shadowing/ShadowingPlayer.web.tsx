import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';

export interface PlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  setRate: (rate: number) => void;
}

interface ShadowingPlayerProps {
  videoId: string;
  onTimeUpdate?: (seconds: number) => void;
  onStateChange?: (state: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const ShadowingPlayer = forwardRef<PlayerRef, ShadowingPlayerProps>(
  ({ videoId, onTimeUpdate, onStateChange }, ref) => {
    const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`).current;
    const playerInstance = useRef<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onStateChangeRef = useRef(onStateChange);
    onTimeUpdateRef.current = onTimeUpdate;
    onStateChangeRef.current = onStateChange;

    const seekTo = (seconds: number) => {
      if (playerInstance.current?.seekTo) {
        playerInstance.current.seekTo(seconds, true);
      }
    };

    const play = () => {
      if (playerInstance.current?.playVideo) {
        playerInstance.current.playVideo();
      }
    };

    const pause = () => {
      if (playerInstance.current?.pauseVideo) {
        playerInstance.current.pauseVideo();
      }
    };

    const getCurrentTime = (): number => {
      if (playerInstance.current?.getCurrentTime) {
        return playerInstance.current.getCurrentTime() || 0;
      }
      return 0;
    };

    const setRate = (rate: number) => {
      if (playerInstance.current?.setPlaybackRate) {
        playerInstance.current.setPlaybackRate(rate);
      }
    };

    useImperativeHandle(ref, () => ({
      seekTo,
      play,
      pause,
      getCurrentTime,
      setRate,
    }));

    useEffect(() => {
      let isMounted = true;

      const createPlayer = () => {
        if (!isMounted || !window.YT?.Player) return;
        const iframeEl = document.getElementById(containerId);
        if (!iframeEl) return;

        try {
          playerInstance.current?.destroy?.();
        } catch {
          // ignore
        }
        playerInstance.current = new window.YT.Player(containerId, {
          events: {
            onReady: () => {
              if (!isMounted) return;
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerInstance.current?.getCurrentTime) {
                  const t = playerInstance.current.getCurrentTime();
                  onTimeUpdateRef.current?.(t);
                }
              }, 200);
            },
            onStateChange: (event: any) => {
              onStateChangeRef.current?.(event.data);
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        const prevHandler = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevHandler?.();
          if (isMounted) createPlayer();
        };

        if (!document.getElementById('youtube-iframe-api')) {
          const script = document.createElement('script');
          script.id = 'youtube-iframe-api';
          script.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(script);
        }
      }

      return () => {
        isMounted = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        try {
          playerInstance.current?.destroy?.();
        } catch {
          // ignore
        }
        playerInstance.current = null;
      };
    }, [containerId, videoId]);

    const originParam =
      typeof window !== 'undefined' && window.location?.origin
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : '';
    const iframeSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1${originParam}`;

    return (
      <View style={styles.wrapper}>
        <iframe
          key={videoId}
          id={containerId}
          src={iframeSrc}
          title="YouTube Shadowing Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
            borderRadius: 16,
          }}
        />
      </View>
    );
  },
);

ShadowingPlayer.displayName = 'ShadowingPlayer';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    minHeight: 200,
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: nihongoTheme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
});
