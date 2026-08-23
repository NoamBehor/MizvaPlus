import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import {
  getAsyncPlaybackState,
  pauseSpeaking,
  playHebrewContent,
  resumeSpeaking,
  stopSpeaking,
  supportsTtsPauseResume,
  type AudioPlaybackState,
} from '@/services/audio';

interface MitzvahAudioControlsProps {
  content: string;
}

export function MitzvahAudioControls({ content }: MitzvahAudioControlsProps) {
  const [playbackState, setPlaybackState] =
    useState<AudioPlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <View>
      <View className="flex-row items-center justify-end gap-3">
        <Pressable
          onPress={handleStop}
          accessibilityRole="button"
          accessibilityLabel="עצור השמעה"
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.border,
            minHeight: 48,
            minWidth: 80,
            alignItems: 'center',
            justifyContent: 'center',
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
              minHeight: 48,
              minWidth: 80,
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
          accessibilityRole="button"
          accessibilityLabel={
            isPaused ? 'המשך השמעה' : isSpeaking ? 'עצור והתחל מחדש' : 'השמע'
          }
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: colors.accent,
            minHeight: 48,
            minWidth: 100,
            alignItems: 'center',
            justifyContent: 'center',
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
