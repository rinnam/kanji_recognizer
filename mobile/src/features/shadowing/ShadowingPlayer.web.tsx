import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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
    const intervalRef = useRef<any>(null);
    const { width } = useWindowDimensions();

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
        if (!window.YT?.Player || !document.getElementById(containerId)) return;

        if (playerInstance.current) {
          playerInstance.current.loadVideoById(videoId);
          return;
        }

        playerInstance.current = new window.YT.Player(containerId, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerInstance.current?.getCurrentTime) {
                  const t = playerInstance.current.getCurrentTime();
                  onTimeUpdate?.(t);
                }
              }, 200);
            },
            onStateChange: (event: any) => {
              onStateChange?.(event.data);
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
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [videoId]);

    return (
      <View style={styles.wrapper}>
        <div id={containerId} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
      </View>
    );
  },
);

ShadowingPlayer.displayName = 'ShadowingPlayer';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: nihongoTheme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
});
