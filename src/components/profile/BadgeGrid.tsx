import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/common/AppIcon';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BADGE_DEFINITIONS } from '@/constants/badges';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import { useGamificationStore } from '@/store/gamificationStore';
import type {
  BadgeConditionType,
  BadgeDefinition,
  GamificationStats,
} from '@/types/gamification';

type TrackId = 'streak' | 'quiz' | 'mitzvah';
type DetailId = TrackId | 'all';
type MilestoneState = 'complete' | 'current' | 'locked';

interface BadgeGridProps {
  stats: GamificationStats | null;
}

interface TrackDefinition {
  id: TrackId;
  title: string;
  subtitle: string;
  icon: AppIconName;
  iconColor: string;
  iconBackground: string;
  iconBorder: string;
  fillColor: string;
  shape: 'rounded' | 'circle';
  conditionType: BadgeConditionType;
  unit: string;
  currentValue: (stats: GamificationStats) => number;
}

const TRACKS: TrackDefinition[] = [
  {
    id: 'streak',
    title: 'רצף ימים והתמדה',
    subtitle: 'שמירה על חיבור יומיומי',
    icon: 'flame',
    iconColor: '#D97706',
    iconBackground: '#FFFBEB',
    iconBorder: '#FDE68A',
    fillColor: '#F59E0B',
    shape: 'rounded',
    conditionType: 'STREAK',
    unit: 'ימים',
    currentValue: (stats) => stats.streakCount,
  },
  {
    id: 'quiz',
    title: 'ידע והלכה',
    subtitle: 'תשובות נכונות בחידונים',
    icon: 'scroll',
    iconColor: homeTheme.primary,
    iconBackground: '#EFF6FF',
    iconBorder: '#DBEAFE',
    fillColor: homeTheme.primary,
    shape: 'circle',
    conditionType: 'QUIZ_CORRECT',
    unit: 'תשובות',
    currentValue: (stats) => stats.correctQuizCount,
  },
  {
    id: 'mitzvah',
    title: 'מצוות ומעשים טובים',
    subtitle: 'קיום מצוות מעשיות',
    icon: 'sparkles',
    iconColor: '#059669',
    iconBackground: '#ECFDF5',
    iconBorder: '#A7F3D0',
    fillColor: homeTheme.success,
    shape: 'rounded',
    conditionType: 'MITZVAH_COUNT',
    unit: 'מצוות',
    currentValue: (stats) => stats.completedMitzvotCount,
  },
];

export function BadgeGrid({ stats }: BadgeGridProps) {
  const fontsLoaded = useHomeFonts();
  const badges = useGamificationStore((state) => state.badges);
  const unlockedIds = new Set(badges.map((badge) => badge.badgeId));
  const [detail, setDetail] = useState<DetailId | null>(null);
  const unlockedCount = badges.filter((badge) =>
    BADGE_DEFINITIONS.some((definition) => definition.id === badge.badgeId),
  ).length;

  const toggleDetail = (next: DetailId) => {
    setDetail((current) => (current === next ? null : next));
  };

  const detailBadges =
    detail === null
      ? []
      : detail === 'all'
        ? BADGE_DEFINITIONS
        : BADGE_DEFINITIONS.filter(
            (badge) =>
              badge.conditionType ===
              TRACKS.find((track) => track.id === detail)?.conditionType,
          );

  return (
    <View style={{ marginBottom: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            accessibilityRole="header"
            style={[
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { fontSize: 18, color: homeTheme.text, textAlign: 'right' },
            ]}
          >
            הישגים
          </Text>
          <View style={countChip}>
            <Text style={[typography.caption, { color: '#B45309', fontSize: 11 }]}>
              {unlockedCount} מתוך {BADGE_DEFINITIONS.length} פתוחים
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="עוד הישגים"
          accessibilityState={{ expanded: detail === 'all' }}
          onPress={() => toggleDetail('all')}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }}
        >
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: homeTheme.primary, fontSize: 12 },
            ]}
          >
            עוד הישגים
          </Text>
          <AppIcon name="chevronLeft" size={14} color={homeTheme.primary} />
        </Pressable>
      </View>

      {TRACKS.map((track) => {
        const trackBadges = BADGE_DEFINITIONS.filter(
          (badge) => badge.conditionType === track.conditionType,
        ).sort((left, right) => left.conditionValue - right.conditionValue);
        const current = stats ? track.currentValue(stats) : 0;
        const progress = getTrackProgress(trackBadges, current, unlockedIds, track.unit);

        return (
          <View key={track.id}>
            <Card elevated style={cardStyle}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: track.iconBorder,
                      backgroundColor: track.iconBackground,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppIcon name={track.icon} size={16} color={track.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        homeFontStyle(fontsLoaded, homeFonts.bold),
                        {
                          color: homeTheme.text,
                          fontSize: 14,
                          textAlign: 'right',
                          writingDirection: 'rtl',
                        },
                      ]}
                    >
                      {track.title}
                    </Text>
                    <Text style={[typography.caption, { fontSize: 10, lineHeight: 14 }]}>
                      {track.subtitle}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`פירוט ${track.title}`}
                  accessibilityState={{ expanded: detail === track.id }}
                  onPress={() => toggleDetail(track.id)}
                  hitSlop={8}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text
                    style={[
                      homeFontStyle(fontsLoaded, homeFonts.semibold),
                      { color: homeTheme.primary, fontSize: 12 },
                    ]}
                  >
                    פירוט
                  </Text>
                </Pressable>
              </View>

              {track.id === 'streak' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={streakTrackContent}
                  style={{ marginTop: spacing.md }}
                >
                  {trackBadges.map((badge) => {
                    const state = milestoneState(badge, current, unlockedIds, progress.nextId);
                    return (
                      <Milestone
                        key={badge.id}
                        badge={badge}
                        state={state}
                        shape={track.shape}
                        fillColor={track.fillColor}
                        completeBackground={track.iconBackground}
                        completeColor={track.iconColor}
                        unitLabel={track.unit}
                        fontsLoaded={fontsLoaded}
                      />
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={gridTrack}>
                  {trackBadges.map((badge) => {
                    const state = milestoneState(badge, current, unlockedIds, progress.nextId);
                    return (
                      <Milestone
                        key={badge.id}
                        badge={badge}
                        state={state}
                        shape={track.shape}
                        fillColor={track.fillColor}
                        completeBackground={track.iconBackground}
                        completeColor={track.iconColor}
                        unitLabel={track.unit}
                        fontsLoaded={fontsLoaded}
                        gridCell
                      />
                    );
                  })}
                </View>
              )}

              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: '#F8FAFC',
                }}
              >
                <ProgressBar
                  percentage={progress.percentage}
                  showPercentageLabel={false}
                  fillColor={track.fillColor}
                  height={6}
                  accessibilityLabel={progress.summary}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                    marginTop: spacing.xs,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      homeFontStyle(fontsLoaded, homeFonts.semibold),
                      { color: homeTheme.text, flex: 1 },
                    ]}
                  >
                    {progress.summary}
                  </Text>
                  <Text style={[typography.caption, { color: homeTheme.muted }]}>
                    {progress.counter}
                  </Text>
                </View>
              </View>
            </Card>

            {detail === track.id ? (
              <BadgeDetailList
                badges={detailBadges}
                unlockedIds={unlockedIds}
                fontsLoaded={fontsLoaded}
              />
            ) : null}
          </View>
        );
      })}

      {detail === 'all' ? (
        <BadgeDetailList
          badges={detailBadges}
          unlockedIds={unlockedIds}
          fontsLoaded={fontsLoaded}
        />
      ) : null}
    </View>
  );
}

function BadgeDetailList({
  badges,
  unlockedIds,
  fontsLoaded,
}: {
  badges: BadgeDefinition[];
  unlockedIds: Set<string>;
  fontsLoaded: boolean;
}) {
  const stored = useGamificationStore((state) => state.badges);

  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      {badges.map((badge) => {
        const isUnlocked = unlockedIds.has(badge.id);
        const userBadge = stored.find((item) => item.badgeId === badge.id);

        return (
          <Card key={badge.id} style={detailCard}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isUnlocked ? `${colors.accent}20` : colors.border,
                opacity: isUnlocked ? 1 : 0.55,
              }}
            >
              <Text style={{ fontSize: 22 }}>{isUnlocked ? badge.icon : '🔒'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  {
                    color: homeTheme.text,
                    fontSize: 16,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                    opacity: isUnlocked ? 1 : 0.55,
                  },
                ]}
              >
                {badge.titleHebrew}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  { marginTop: 2, opacity: isUnlocked ? 1 : 0.55 },
                ]}
              >
                {badge.descriptionHebrew}
              </Text>
              {isUnlocked && userBadge ? (
                <Text style={[typography.caption, { marginTop: 4 }]}>
                  נפתח ב-{new Date(userBadge.unlockedAt).toLocaleDateString('he-IL')}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function Milestone({
  badge,
  state,
  shape,
  fillColor,
  completeBackground,
  completeColor,
  unitLabel,
  fontsLoaded,
  gridCell = false,
}: {
  badge: BadgeDefinition;
  state: MilestoneState;
  shape: 'rounded' | 'circle';
  fillColor: string;
  completeBackground: string;
  completeColor: string;
  unitLabel: string;
  fontsLoaded: boolean;
  gridCell?: boolean;
}) {
  const stateLabel =
    state === 'complete' ? 'הושלם' : state === 'current' ? 'יעד נוכחי' : 'נעול';
  const radius = shape === 'circle' ? 24 : 16;

  return (
    <View
      accessibilityLabel={`${badge.conditionValue}, ${badge.titleHebrew}, ${stateLabel}`}
      style={{
        width: gridCell ? undefined : 64,
        flex: gridCell ? 1 : undefined,
        alignItems: 'center',
        opacity: state === 'locked' ? 0.7 : 1,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            state === 'current' ? fillColor : state === 'complete' ? completeBackground : '#F8FAFC',
          borderWidth: state === 'current' ? 0 : 1,
          borderColor: state === 'complete' ? completeColor : '#E2E8F0',
          ...(state === 'current'
            ? {
                shadowColor: fillColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 4,
                elevation: 2,
              }
            : null),
        }}
      >
        <Text
          style={[
            homeFontStyle(fontsLoaded, homeFonts.extrabold),
            {
              color: state === 'current' ? colors.white : state === 'complete' ? completeColor : '#94A3B8',
              fontSize: 12,
              lineHeight: 14,
            },
          ]}
        >
          {badge.conditionValue}
        </Text>
        <Text
          style={{
            fontSize: 8,
            lineHeight: 10,
            fontWeight: '600',
            color:
              state === 'current'
                ? 'rgba(255,255,255,0.95)'
                : state === 'complete'
                  ? completeColor
                  : '#94A3B8',
            marginTop: 1,
          }}
        >
          {unitLabel}
        </Text>
        {state === 'complete' ? (
          <View style={checkBadge}>
            <Text style={{ color: colors.white, fontSize: 8, lineHeight: 10 }}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          typography.caption,
          {
            marginTop: 6,
            fontSize: 10,
            lineHeight: 13,
            textAlign: 'center',
            color: state === 'complete' ? '#047857' : state === 'current' ? fillColor : '#94A3B8',
            fontWeight: state === 'locked' ? '400' : '600',
          },
        ]}
      >
        {stateLabel}
      </Text>
    </View>
  );
}

function milestoneState(
  badge: BadgeDefinition,
  current: number,
  unlockedIds: Set<string>,
  nextId: string | null,
): MilestoneState {
  if (unlockedIds.has(badge.id) || current >= badge.conditionValue) {
    return 'complete';
  }
  if (badge.id === nextId) {
    return 'current';
  }
  return 'locked';
}

function getTrackProgress(
  trackBadges: BadgeDefinition[],
  current: number,
  unlockedIds: Set<string>,
  unit: string,
): { percentage: number; summary: string; counter: string; nextId: string | null } {
  const next = trackBadges.find(
    (badge) => !unlockedIds.has(badge.id) && current < badge.conditionValue,
  );

  if (!next) {
    const last = trackBadges[trackBadges.length - 1];
    const target = last?.conditionValue ?? 0;
    return {
      percentage: 100,
      summary: 'כל היעדים בקטגוריה הושגו',
      counter: `${target} מתוך ${target} ${unit}`,
      nextId: null,
    };
  }

  const percentage = Math.max(
    0,
    Math.min(100, Math.round((current / next.conditionValue) * 100)),
  );
  const remaining = Math.max(0, next.conditionValue - current);

  return {
    percentage,
    summary: `נותרו ${remaining} ${unit} להשגת ${next.titleHebrew}`,
    counter: `${current} מתוך ${next.conditionValue} ${unit}`,
    nextId: next.id,
  };
}

const cardStyle = {
  backgroundColor: colors.white,
  borderColor: '#F1F5F9',
  borderRadius: homeTheme.cardRadius,
  marginBottom: spacing.md,
};

const streakTrackContent = {
  flexDirection: 'row' as const,
  gap: 8,
  paddingVertical: 4,
  minWidth: '100%' as const,
};

const gridTrack = {
  flexDirection: 'row' as const,
  gap: 10,
  marginTop: spacing.md,
};

const detailCard = {
  backgroundColor: colors.white,
  borderColor: '#F1F5F9',
  borderRadius: homeTheme.cardRadius,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: spacing.sm,
};

const countChip = {
  backgroundColor: '#FFFBEB',
  borderWidth: 1,
  borderColor: '#FDE68A',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 2,
};

const checkBadge = {
  position: 'absolute' as const,
  top: -4,
  right: -4,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: homeTheme.success,
  borderWidth: 1,
  borderColor: colors.white,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
