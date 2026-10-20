import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';
import { getMitzvahIcon } from '@/utils/mitzvah';

interface TodayMitzvotCardProps {
  mitzvot: Mitzvah[];
  isCompleted: (mitzvahId: string) => boolean;
  onOpenMitzvah: (mitzvahId: string) => void;
  onSelectMitzvot: () => void;
}

interface MitzvahRowProps {
  mitzvah: Mitzvah;
  completed: boolean;
  onPress: () => void;
}

function MitzvahRow({ mitzvah, completed, onPress }: MitzvahRowProps) {
  const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);
  const rowScale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const wasCompletedRef = useRef(completed);

  useEffect(() => {
    if (wasCompletedRef.current === completed) {
      return;
    }

    wasCompletedRef.current = completed;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(rowScale, {
          toValue: completed ? 1.02 : 0.99,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(rowScale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: completed ? 1.14 : 0.92,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(highlightOpacity, {
          toValue: completed ? 0.22 : 0.08,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(highlightOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [badgeScale, completed, highlightOpacity, rowScale]);

  return (
    <Animated.View style={{ transform: [{ scale: rowScale }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${mitzvah.title} — פתח פרטים`}
        accessibilityState={{ selected: completed }}
        className="flex-row items-center justify-between"
        style={{
          backgroundColor: completed ? '#F0FDF4' : '#F8FAFC',
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 52,
          opacity: completed ? 0.9 : 1,
          borderWidth: 1,
          borderColor: completed ? '#BBF7D0' : '#E2E8F0',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            ...{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: completed ? colors.success : colors.accent,
              opacity: highlightOpacity,
            },
          }}
        />

        <Animated.View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: completed ? colors.success : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: badgeScale }],
          }}
        >
          <Text
            style={{
              color: completed ? colors.white : colors.accent,
              fontWeight: '700',
              fontSize: completed ? 14 : 12,
            }}
          >
            {completed ? '✓' : `+${mitzvah.xpReward}`}
          </Text>
        </Animated.View>

        <View className="flex-row items-center gap-3">
          <Text
            style={[
              typography.body,
              {
                color: completed ? colors.muted : colors.text,
              },
            ]}
          >
            {mitzvah.title}
          </Text>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function TodayMitzvotCard({
  mitzvot,
  isCompleted,
  onOpenMitzvah,
  onSelectMitzvot,
}: TodayMitzvotCardProps) {
  const handlePress = (mitzvahId: string, completed: boolean) => {
    void Haptics.impactAsync(
      completed
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    onOpenMitzvah(mitzvahId);
  };

  if (mitzvot.length === 0) {
    return (
      <Card className="mb-4 items-center" elevated>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          עדיין לא בחרת מצוות למעקב
        </Text>
        <Text
          style={[
            typography.bodySmall,
            { textAlign: 'center', marginTop: 8, marginBottom: 16 },
          ]}
        >
          בחר מצוות כדי להתחיל לעקוב אחר ההתקדמות היומית שלך.
        </Text>
        <Pressable
          onPress={onSelectMitzvot}
          className="rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.accent, minHeight: 52 }}
        >
          <Text style={[typography.label, { color: colors.surface }]}>
            בחר מצוות
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card className="mb-4" elevated>
      <Text style={[typography.subtitle, { marginBottom: 12 }]}>
        המצוות שלי היום
      </Text>

      <View style={{ gap: spacing.sm }}>
        {mitzvot.map((mitzvah) => {
          const completed = isCompleted(mitzvah.id);
          return (
            <MitzvahRow
              key={mitzvah.id}
              mitzvah={mitzvah}
              completed={completed}
              onPress={() => handlePress(mitzvah.id, completed)}
            />
          );
        })}
      </View>
    </Card>
  );
}
