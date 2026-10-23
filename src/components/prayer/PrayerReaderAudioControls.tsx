import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography, surfaces } from '@/constants/theme';
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
}

export function PrayerReaderAudioControls({
  content,
}: PrayerReaderAudioControlsProps) {
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
      className="border-t border-border px-4 py-3"
      style={{
        backgroundColor: surfaces.prayerReaderBackground,
        borderTopColor: colors.border,
      }}
    >
      {isWebPreview ? (
        <Text
          style={[
            typography.caption,
            { color: colors.muted, textAlign: 'center', marginBottom: 8 },
          ]}
        >
          השמעה זמינה באפליקציה בנייד
        </Text>
      ) : null}

      <View className="flex-row items-center gap-3" style={{ width: '100%' }}>
        <Pressable
          onPress={handleStop}
          disabled={!hasContent || isWebPreview}
          accessibilityRole="button"
          accessibilityLabel="עצור השמעה"
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.border,
            minHeight: 44,
            minWidth: 72,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !hasContent || isWebPreview ? 0.5 : 1,
          }}
        >
          <Text style={typography.label}>■ עצור</Text>
        </Pressable>

        {showPauseControl ? (
          <Pressable
            onPress={handlePause}
            accessibilityRole="button"
            accessibilityLabel="השהה השמעה"
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: colors.secondary,
              minHeight: 44,
              minWidth: 72,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[typography.label, { color: colors.white }]}>
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
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.accent,
            minHeight: 44,
            minWidth: 88,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !hasContent || isWebPreview ? 0.5 : 1,
          }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            {isPaused ? '▶ המשך' : isSpeaking ? '■ עצור' : '▶ השמע'}
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <Text
          style={[
            typography.caption,
            { color: colors.muted, marginTop: 8, textAlign: 'right' },
          ]}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
