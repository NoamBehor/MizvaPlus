import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { ltrLayoutStyle } from '@/constants/layoutDirection';
import { spacing, typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';
import { formatIsraelTime } from '@/utils/timezone';

const RING_SIZE = 56;
const RING_STROKE = 4;
const RING_COLOR = '#34D399';
const RING_TRACK = 'rgba(51, 65, 85, 0.75)';
const RING_HOLE = '#152033';

interface TodayMitzvotCardProps {
  mitzvot: Mitzvah[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  streakCount: number;
  isCompleted: (mitzvahId: string) => boolean;
  getCompletedAt: (mitzvahId: string) => string | null;
  onOpenMitzvah: (mitzvahId: string) => void;
  onToggleMitzvah: (mitzvahId: string) => void;
  onSelectMitzvot: () => void;
}

interface MitzvahRowProps {
  mitzvah: Mitzvah;
  completed: boolean;
  completedAt: string | null;
  onOpen: () => void;
  onToggle: () => void;
}

function sumXp(mitzvot: Mitzvah[], completed: boolean, isCompleted: (id: string) => boolean): number {
  return mitzvot.reduce((sum, mitzvah) => {
    if (isCompleted(mitzvah.id) !== completed) {
      return sum;
    }
    return sum + mitzvah.xpReward;
  }, 0);
}

/** Right half sweeps 12→6, then the left half continues 6→12. Geometry stays LTR. */
function ProgressRing({ percentage }: { percentage: number }) {
  const fontsLoaded = useHomeFonts();
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const rightSweep = clamped >= 50 ? 180 : (clamped / 50) * 180;
  const leftSweep = clamped <= 50 ? 0 : ((clamped - 50) / 50) * 180;
  const hole = RING_SIZE - RING_STROKE * 2;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[ltrLayoutStyle, { width: RING_SIZE, height: RING_SIZE }]}
    >
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            backgroundColor: RING_TRACK,
          }}
        />
        <RingHalf size={RING_SIZE} sweep={rightSweep} side="right" />
        <RingHalf size={RING_SIZE} sweep={leftSweep} side="left" />
        <View
          style={{
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            backgroundColor: RING_HOLE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.extrabold),
              {
                color: '#FFFFFF',
                fontSize: 12,
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {clamped}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function RingHalf({
  size,
  sweep,
  side,
}: {
  size: number;
  sweep: number;
  side: 'left' | 'right';
}) {
  if (sweep <= 0) {
    return null;
  }

  const rotation = side === 'right' ? -180 + sweep : sweep;

  return (
    <View
      style={{
        position: 'absolute',
        width: size / 2,
        height: size,
        overflow: 'hidden',
        left: side === 'right' ? size / 2 : 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: side === 'right' ? -size / 2 : 0,
          transform: [{ rotate: `${rotation}deg` }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: 0,
            width: size / 2,
            height: size,
            backgroundColor: RING_COLOR,
            borderTopRightRadius: size / 2,
            borderBottomRightRadius: size / 2,
          }}
        />
      </View>
    </View>
  );
}

function formatDoneTime(completedAt: string | null): string | null {
  if (!completedAt) {
    return null;
  }
  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatIsraelTime(date);
}

function MitzvahRow({ mitzvah, completed, completedAt, onOpen, onToggle }: MitzvahRowProps) {
  const fontsLoaded = useHomeFonts();
  const badgeScale = useRef(new Animated.Value(1)).current;
  const wasCompletedRef = useRef(completed);
  const doneTime = formatDoneTime(completedAt);

  useEffect(() => {
    if (wasCompletedRef.current === completed) {
      return;
    }
    wasCompletedRef.current = completed;
    Animated.sequence([
      Animated.timing(badgeScale, {
        toValue: 1.12,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [badgeScale, completed]);

  return (
    <View
      style={[
        homeTheme.cardShadow,
        {
          backgroundColor: completed ? homeTheme.successSoft : homeTheme.surface,
          borderRadius: homeTheme.cardRadius,
          borderWidth: 1,
          borderColor: completed ? '#A7F3D0' : 'rgba(226, 232, 240, 0.9)',
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={mitzvah.title}
          accessibilityState={{ checked: completed }}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(
              completed
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Medium,
            );
            onToggle();
          }}
        >
          <Animated.View
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: completed ? homeTheme.success : '#F8FAFC',
              borderWidth: completed ? 0 : 2,
              borderColor: '#CBD5E1',
              transform: [{ scale: badgeScale }],
            }}
          >
            {completed ? <AppIcon name="check" size={16} color="#FFFFFF" /> : null}
          </Animated.View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${mitzvah.title}, פתח פרטים`}
          onPress={onOpen}
          style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
        >
          <Text
            style={[
              typography.body,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              {
                color: completed ? homeTheme.muted : homeTheme.text,
                textDecorationLine: completed ? 'line-through' : 'none',
              },
            ]}
          >
            {mitzvah.title}
          </Text>
          <Text style={[typography.caption, { color: completed ? homeTheme.successText : homeTheme.muted }]}>
            {completed
              ? doneTime
                ? `בוצע • ${doneTime}`
                : 'בוצע'
              : mitzvah.description}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          backgroundColor: completed ? '#D1FAE5' : homeTheme.primarySoft,
          borderWidth: completed ? 0 : 1,
          borderColor: homeTheme.primaryBorder,
        }}
      >
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            { color: completed ? homeTheme.successText : homeTheme.primary },
          ]}
        >
          {completed ? `+${mitzvah.xpReward} XP ✓` : `+${mitzvah.xpReward} XP`}
        </Text>
      </View>
    </View>
  );
}

export function TodayMitzvotCard({
  mitzvot,
  completedCount,
  totalCount,
  progressPercentage,
  streakCount,
  isCompleted,
  getCompletedAt,
  onOpenMitzvah,
  onToggleMitzvah,
  onSelectMitzvot,
}: TodayMitzvotCardProps) {
  const fontsLoaded = useHomeFonts();
  const remainingCount = Math.max(0, totalCount - completedCount);
  const remainingXp = useMemo(
    () => sumXp(mitzvot, false, isCompleted),
    [isCompleted, mitzvot],
  );
  const completedXp = useMemo(
    () => sumXp(mitzvot, true, isCompleted),
    [isCompleted, mitzvot],
  );
  const xpLabel = remainingXp > 0 ? `XP ${remainingXp}+` : `XP ${completedXp}`;
  const headline = `${completedCount} מתוך ${totalCount} מצוות הושלמו היום`;
  const subtitle =
    remainingCount > 0
      ? `עוד ${remainingCount} מצוות להשלמת היעד היומי`
      : 'כל המצוות להיום הושלמו';
  const summaryLabel = [
    headline,
    `${progressPercentage} אחוז`,
    subtitle,
    streakCount > 0 ? `רצף פעיל ${streakCount} ימים` : null,
    'מצווה גוררת מצווה, פרקי אבות ד ב',
  ]
    .filter(Boolean)
    .join('. ');

  if (mitzvot.length === 0) {
    return (
      <View
        style={[
          homeTheme.cardShadow,
          {
            backgroundColor: homeTheme.surface,
            borderRadius: homeTheme.cardRadius,
            padding: spacing.lg,
            marginBottom: homeTheme.sectionGap,
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[typography.subtitle, { textAlign: 'center', color: homeTheme.text }]}>
          עדיין לא בחרת מצוות למעקב
        </Text>
        <Text
          style={[
            typography.bodySmall,
            { textAlign: 'center', marginTop: 8, marginBottom: 16, color: homeTheme.muted },
          ]}
        >
          בחר מצוות כדי להתחיל לעקוב אחר ההתקדמות היומית שלך.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="בחר מצוות"
          onPress={onSelectMitzvot}
          style={{
            borderRadius: 12,
            paddingHorizontal: spacing.lg,
            minHeight: 44,
            justifyContent: 'center',
            backgroundColor: homeTheme.primary,
          }}
        >
          <Text style={[typography.label, { color: '#FFFFFF' }]}>בחר מצוות</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: homeTheme.sectionGap, gap: spacing.sm }}>
      <LinearGradient
        accessible
        accessibilityRole="summary"
        accessibilityLabel={summaryLabel}
        colors={['#111c2e', '#1c293d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          homeTheme.heroShadow,
          {
            borderRadius: homeTheme.cardRadius,
            borderWidth: 1,
            borderColor: 'rgba(51, 65, 85, 0.6)',
            padding: spacing.md,
            overflow: 'hidden',
            gap: 14,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          {streakCount > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderWidth: 1,
                borderColor: 'rgba(51, 65, 85, 0.8)',
                flexShrink: 1,
              }}
            >
              <Text style={{ fontSize: 11 }}>🔥</Text>
              <Text
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  { color: '#E2E8F0', flexShrink: 1 },
                ]}
              >
                {`רצף פעיל: ${streakCount} ימים ברציפות`}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: 'rgba(2, 44, 34, 0.6)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}
          >
            <Text
              style={[
                typography.caption,
                homeFontStyle(fontsLoaded, homeFonts.bold),
                { color: '#34D399', fontVariant: ['tabular-nums'] },
              ]}
            >
              {xpLabel}
            </Text>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: '#34D399',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#34D399', fontSize: 8, lineHeight: 10 }}>★</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.display),
                {
                  color: '#FFFFFF',
                  fontSize: 18,
                  lineHeight: 24,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                },
              ]}
            >
              {headline}
            </Text>
            <Text
              style={[
                typography.caption,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                {
                  color: '#CBD5E1',
                  marginTop: 4,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                },
              ]}
            >
              {subtitle}
            </Text>
          </View>
          <ProgressRing percentage={progressPercentage} />
        </View>

        <View
          style={{
            borderRadius: 12,
            backgroundColor: 'rgba(10, 18, 32, 0.7)',
            borderWidth: 1,
            borderColor: 'rgba(30, 41, 59, 0.8)',
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Text style={{ color: homeTheme.gold, fontSize: 14, fontWeight: '700' }}>❞</Text>
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: '#CBD5E1', textAlign: 'center', writingDirection: 'rtl', flexShrink: 1 },
            ]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>"מצווה גוררת מצווה"</Text>
            <Text>{' (פרקי אבות ד׳, ב׳)'}</Text>
          </Text>
        </View>
      </LinearGradient>

      {mitzvot.map((mitzvah) => (
        <MitzvahRow
          key={mitzvah.id}
          mitzvah={mitzvah}
          completed={isCompleted(mitzvah.id)}
          completedAt={getCompletedAt(mitzvah.id)}
          onOpen={() => onOpenMitzvah(mitzvah.id)}
          onToggle={() => onToggleMitzvah(mitzvah.id)}
        />
      ))}
    </View>
  );
}
