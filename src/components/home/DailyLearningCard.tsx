import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import { useDailyLearning } from '@/hooks/useDailyLearning';
import { speakHebrew, stopSpeaking } from '@/services/audio';

interface DailyLearningCardProps {
  userId: string;
}

export function DailyLearningCard({ userId }: DailyLearningCardProps) {
  const fontsLoaded = useHomeFonts();
  const { content, completionState, sourceLabel, markInProgress, markCompleted } =
    useDailyLearning(userId);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!content) {
      return;
    }

    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }

    setSpeechError(null);
    if (completionState === 'not_started') {
      await markInProgress();
    }

    setSpeaking(true);
    try {
      await speakHebrew(content.bodyHebrew);
    } catch {
      setSpeechError('לא ניתן להשמיע כרגע');
    } finally {
      setSpeaking(false);
    }
  }, [completionState, content, markInProgress, speaking]);

  if (!content) {
    return (
      <View
        style={{
          marginBottom: homeTheme.sectionGap,
          borderRadius: homeTheme.cardRadius,
          borderWidth: 1,
          borderColor: homeTheme.goldBorder,
          backgroundColor: homeTheme.goldSoft,
          padding: spacing.md,
        }}
      >
        <Text style={[typography.label, { color: '#78350F' }]}>לימוד יומי</Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.xs, color: homeTheme.muted }]}>
          תוכן לימוד יומי לא זמין כרגע
        </Text>
      </View>
    );
  }

  const title =
    content.type === 'tehillim' ? 'תהילים יומי לקריאה ושמיעה' : 'לימוד יומי';
  const playLabel = speaking ? 'עצור השמעה' : `השמע ${content.topicHebrew}`;

  return (
    <View
      style={{
        marginBottom: homeTheme.sectionGap,
        borderRadius: homeTheme.cardRadius,
        borderWidth: 1,
        borderColor: homeTheme.goldBorder,
        backgroundColor: homeTheme.goldSoft,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#F59E0B',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="headphones" color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.bodySmall,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: '#451A03' },
            ]}
          >
            {title}
          </Text>
          <Text numberOfLines={2} style={[typography.caption, { color: '#92400E' }]}>
            {content.topicHebrew}
            {sourceLabel ? ` • ${sourceLabel}` : ''}
          </Text>
          {completionState === 'completed' ? (
            <Text style={[typography.caption, { color: homeTheme.successText }]}>סיימת</Text>
          ) : null}
          {speechError ? (
            <Text style={[typography.caption, { color: '#B91C1C' }]}>{speechError}</Text>
          ) : null}
          {completionState === 'in_progress' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="סיימתי את הלימוד היומי"
              onPress={() => {
                void markCompleted();
              }}
              hitSlop={8}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={[typography.caption, homeFontStyle(fontsLoaded, homeFonts.bold), { color: homeTheme.goldDeep }]}>
                סיימתי
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        accessibilityState={{ selected: speaking }}
        hitSlop={6}
        onPress={() => {
          void handlePlay();
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: homeTheme.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={speaking ? 'pause' : 'play'} size={16} color="#B45309" />
      </Pressable>
    </View>
  );
}
