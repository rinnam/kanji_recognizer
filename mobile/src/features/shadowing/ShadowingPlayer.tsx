import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { WebView as RNWebView, type WebViewProps, type WebViewMessageEvent } from 'react-native-webview';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { PlayerRef } from './ShadowingPlayer.web';

export { type PlayerRef };

// Workaround for react-native-webview index.d.ts bug where default P = undefined causes props to be inferred as never
const WebView = RNWebView as unknown as React.ComponentClass<WebViewProps>;

interface ShadowingPlayerProps {
  videoId: string;
  onTimeUpdate?: (seconds: number) => void;
  onStateChange?: (state: number) => void;
}

export const ShadowingPlayer = forwardRef<PlayerRef, ShadowingPlayerProps>(
  ({ videoId, onTimeUpdate, onStateChange }, ref) => {
    const webViewRef = useRef<RNWebView>(null);
    const lastTimeRef = useRef<number>(0);
    const [playerError, setPlayerError] = useState<string | null>(null);

    useEffect(() => {
      setPlayerError(null);
    }, [videoId]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              if (typeof player !== 'undefined' && player && player.seekTo) {
                player.seekTo(${seconds}, true);
              }
            } catch(e) {}
          })();
          true;
        `);
      },
      play: () => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              if (typeof player !== 'undefined' && player && player.playVideo) {
                player.playVideo();
              }
            } catch(e) {}
          })();
          true;
        `);
      },
      pause: () => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              if (typeof player !== 'undefined' && player && player.pauseVideo) {
                player.pauseVideo();
              }
            } catch(e) {}
          })();
          true;
        `);
      },
      getCurrentTime: () => lastTimeRef.current,
      setRate: (rate: number) => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              if (typeof player !== 'undefined' && player && player.setPlaybackRate) {
                player.setPlaybackRate(${rate});
              }
            } catch(e) {}
          })();
          true;
        `);
      },
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; background:#000; overflow:hidden; }
          html, body { width:100%; height:100%; background:#000; }
          #player {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 0;
          }
        </style>
      </head>
      <body>
        <iframe
          id="player"
          src="https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&controls=1&rel=0&modestbranding=1&origin=https://www.youtube-nocookie.com"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>

        <script>
          var player;
          var timer;

          function notify(type, data) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
            }
          }

          function initYT() {
            if (player) return;
            try {
              player = new YT.Player('player', {
                events: {
                  onReady: function() {
                    notify('ready');
                    if (timer) clearInterval(timer);
                    timer = setInterval(function() {
                      try {
                        if (player && typeof player.getCurrentTime === 'function') {
                          var t = player.getCurrentTime();
                          notify('time', { time: t });
                        }
                      } catch(e) {}
                    }, 250);
                  },
                  onStateChange: function(e) {
                    notify('state', { state: e.data });
                  },
                  onError: function(e) {
                    notify('error', { code: e.data });
                  }
                }
              });
            } catch(err) {
              notify('error', { message: String(err) });
            }
          }

          window.onYouTubeIframeAPIReady = initYT;

          if (window.YT && window.YT.Player) {
            initYT();
          } else {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
              firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
              document.head.appendChild(tag);
            }
          }
        </script>
      </body>
      </html>
    `;

    return (
      <View style={styles.wrapper}>
        <WebView
          ref={webViewRef as any}
          source={{ html: htmlContent, baseUrl: 'https://www.youtube-nocookie.com' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          mixedContentMode="always"
          userAgent={
            Platform.OS === 'android'
              ? 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
              : undefined
          }
          originWhitelist={['*']}
          onMessage={(event: WebViewMessageEvent) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'time' && typeof data.time === 'number') {
                lastTimeRef.current = data.time;
                onTimeUpdate?.(data.time);
              } else if (data.type === 'state') {
                onStateChange?.(data.state);
              } else if (data.type === 'error') {
                console.warn('YouTube Player Error:', data);
                if (data.code === 150 || data.code === 101) {
                  setPlayerError('Video này bị chủ kênh YouTube tắt quyền nhúng ngoài web.');
                } else if (data.code === 100 || data.code === 2) {
                  setPlayerError('Không tìm thấy video hoặc ID không đúng.');
                }
              }
            } catch {}
          }}
        />

        {playerError ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>⚠️ {playerError}</Text>
          </View>
        ) : null}
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
    position: 'relative',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
