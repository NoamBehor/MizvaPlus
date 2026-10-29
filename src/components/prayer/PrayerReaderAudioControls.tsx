import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import {
  getAsyncPlaybackState,
  pauseSpeaking,
  playHebrewContent,
  resumeSpeaking,
  stopSpeaking,
  supportsTtsPauseResume,
  type AudioPlaybackState,
} from '@/services/audio';

interface PrayerReaderAudioControlsProps {
  content: string;
  title?: string;
}

export function PrayerReaderAudioControls({
  content,
  title,
}: PrayerReaderAudioControlsProps) {
  const insets = useSafeAreaInsets();
  const fontsLoaded = useHomeFonts();
  const [playbackState, setPlaybackState] =
    useState<AudioPlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isWebPreview = Platform.OS === 'web';
  const hasContent = content.trim().length > 0;

  const syncPlaybackState = useCallback(async () => {
    const state = await getAsyncPlaybackState();
    setPlaybackState(state);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        stopSpeaking();
        setPlaybackState('idle');
      }
    });

    return () => {
      subscription.remove();
      stopSpeaking();
    };
  }, []);

  const handlePlay = async () => {
    if (!hasContent || isWebPreview) {
      return;
    }

    setErrorMessage(null);

    if (playbackState === 'speaking') {
      stopSpeaking();
      setPlaybackState('idle');
      return;
    }

    if (playbackState === 'paused' && supportsTtsPauseResume) {
      resumeSpeaking();
      setPlaybackState('speaking');
      return;
    }

    try {
      setPlaybackState('speaking');
      await playHebrewContent(content);
      setPlaybackState('idle');
    } catch {
      setPlaybackState('idle');
      setErrorMessage('לא ניתן להפעיל שמע כרגע.');
    }
  };

  const handleStop = () => {
    stopSpeaking();
    setPlaybackState('idle');
    setErrorMessage(null);
  };

  const handlePause = () => {
    if (!supportsTtsPauseResume) {
      return;
    }

    pauseSpeaking();
    void syncPlaybackState();
  };

  const isSpeaking = playbackState === 'speaking';
  const isPaused = playbackState === 'paused' && supportsTtsPauseResume;
  const showPauseControl = supportsTtsPauseResume && isSpeaking;

  return (
    <View
      style={{
        backgroundColor: colors.sacredNavy,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm + insets.bottom,
      }}
    >
      {title ? (
        <Text
          numberOfLines={1}
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            {
              color: colors.sacredAmberBorder,
              textAlign: 'right',
              writingDirection: 'rtl',
              marginBottom: spacing.xs,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      {isWebPreview ? (
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.regular),
            { color: colors.sacredLine, textAlign: 'center', marginBottom: 8 },
          ]}
        >
          השמעה זמינה באפליקציה בנייד
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={handleStop}
          disabled={!hasContent || isWebPreview}
          accessibilityRole="button"
          accessibilityLabel="עצור השמעה"
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            minHeight: 44,
            minWidth: 72,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !hasContent || isWebPreview ? 0.5 : 1,
          }}
        >
          <Text
            style={[
              typography.label,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: colors.white },
            ]}
          >
            ■ עצור
          </Text>
        </Pressable>

        {showPauseControl ? (
          <Pressable
            onPress={handlePause}
            accessibilityRole="button"
            accessibilityLabel="השהה השמעה"
            style={{
              backgroundColor: colors.sacredAmber,
              minHeight: 44,
              minWidth: 72,
              borderRadius: borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={[
                typography.label,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: colors.white },
              ]}
            >
              ⏸ השהה
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => void handlePlay()}
          disabled={!hasContent || isWebPreview}
          accessibilityRole="button"
          accessibilityLabel={
            isPaused ? 'המשך השמעה' : isSpeaking ? 'עצור והתחל מחדש' : 'השמע'
          }
          style={{
            backgroundColor: colors.white,
            minHeight: 44,
            minWidth: 88,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !hasContent || isWebPreview ? 0.5 : 1,
          }}
        >
          <Text
            style={[
              typography.label,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: colors.sacredNavy },
            ]}
          >
            {isPaused ? '▶ המשך' : isSpeaking ? '■ עצור' : '▶ השמע'}
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <Text
          style={[
            typography.caption,
            {
              color: colors.sacredAmberBorder,
              marginTop: 8,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
