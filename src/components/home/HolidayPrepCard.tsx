import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/common/Card';
import { formatContentSource } from '@/types/content';
import { getHolidayTheme } from '@/constants/holidayThemes';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getHolidayGuide } from '@/services/holidayGuideService';
import type { HolidayContext } from '@/services/holidayContext';
import type { HolidayGuideSection } from '@/types/holidayGuide';
import { getJson, setJson } from '@/utils/storage';

const DISMISS_STORAGE_PREFIX = '@mitzvahapp/holiday_prep_dismissed:';

interface HolidayPrepCardProps {
  context: HolidayContext;
  overrideHolidayKey?: string | null;
  initialExpanded?: boolean;
}

function renderTipList(
  title: string,
  tips: { id: string; titleHebrew: string; bodyHebrew: string; customNoteHebrew?: string }[],
  textColor: string,
  labelColor: string,
) {
  if (tips.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text
        style={[
          typography.label,
          { color: textColor, textAlign: 'right', fontWeight: '600' },
        ]}
      >
        {title}
      </Text>
      {tips.map((tip) => (
        <View key={tip.id} style={{ marginTop: spacing.sm }}>
          <Text
            style={[
              typography.bodySmall,
              { color: textColor, textAlign: 'right', fontWeight: '600' },
            ]}
          >
            {tip.titleHebrew}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { color: textColor, textAlign: 'right', marginTop: 2 },
            ]}
          >
            {tip.bodyHebrew}
          </Text>
          {tip.customNoteHebrew ? (
            <Text
              style={[
                typography.caption,
                { color: labelColor, textAlign: 'right', marginTop: 2 },
              ]}
            >
              {tip.customNoteHebrew}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function renderSection(
  sectionData: HolidayGuideSection,
  textColor: string,
  labelColor: string,
) {
  return (
    <View key={sectionData.id} style={{ marginTop: spacing.md }}>
      <Text
        style={[
          typography.label,
          { color: textColor, textAlign: 'right', fontWeight: '600' },
        ]}
      >
        {sectionData.titleHebrew}
      </Text>
      {sectionData.items.map((entry) => (
        <View key={entry.id} style={{ marginTop: spacing.sm }}>
          <Text
            style={[
              typography.bodySmall,
              { color: textColor, textAlign: 'right', fontWeight: '600' },
            ]}
          >
            {entry.titleHebrew}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { color: textColor, textAlign: 'right', marginTop: 2 },
            ]}
          >
            {entry.bodyHebrew}
          </Text>
          {entry.customNoteHebrew ? (
            <Text
              style={[
                typography.caption,
                { color: labelColor, textAlign: 'right', marginTop: 2 },
              ]}
            >
              {entry.customNoteHebrew}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function HolidayPrepCard({
  context,
  overrideHolidayKey,
  initialExpanded = false,
}: HolidayPrepCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(initialExpanded);
  const effectiveHolidayKey = overrideHolidayKey ?? context.holidayKey;
  const guide = effectiveHolidayKey ? getHolidayGuide(effectiveHolidayKey) : null;
  const theme = getHolidayTheme(guide?.themeKey ?? context.themeKey);

  useEffect(() => {
    setExpanded(initialExpanded);
  }, [initialExpanded, effectiveHolidayKey]);

  useEffect(() => {
    if (overrideHolidayKey || !context.holidayKey) {
      return;
    }

    void getJson<boolean>(`${DISMISS_STORAGE_PREFIX}${context.holidayKey}`).then(
      (value) => {
        if (value) {
          setDismissed(true);
        }
      },
    );
  }, [context.holidayKey, overrideHolidayKey]);

  const handleDismiss = useCallback(async () => {
    if (overrideHolidayKey || !context.holidayKey) {
      setDismissed(true);
      return;
    }

    setDismissed(true);
    await setJson(`${DISMISS_STORAGE_PREFIX}${context.holidayKey}`, true);
  }, [context.holidayKey, overrideHolidayKey]);

  const isForcedGuide = Boolean(overrideHolidayKey && guide);
  if ((!context.active || !context.prepCardEnabled) && !isForcedGuide) {
    return null;
  }

  if (!guide || dismissed) {
    return null;
  }

  const previewChecklist = guide.checklist.slice(0, expanded ? guide.checklist.length : 3);
  const approachingLabel =
    context.hoursUntil !== undefined
      ? context.hoursUntil <= 24
        ? 'החג מתקרב'
        : `בעוד ${context.daysUntil ?? Math.ceil(context.hoursUntil / 24)} ימים`
      : null;

  return (
    <Card className="mb-4" elevated>
      <LinearGradient
        colors={theme.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: borderRadius.xl,
          padding: spacing.md,
        }}
      >
        <View className="flex-row items-start justify-between">
          <Pressable
            onPress={() => void handleDismiss()}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={12}
            className="rounded-full px-2 py-1"
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[typography.body, { color: theme.labelColor }]}>✕</Text>
          </Pressable>

          <View className="flex-1 items-end">
            <Text style={{ fontSize: 22, marginBottom: spacing.xs }}>
              {theme.icon}
            </Text>
            <Text
              style={[
                typography.subtitle,
                { color: theme.textColor, textAlign: 'right' },
              ]}
            >
              {overrideHolidayKey ? guide.titleHebrew : (context.holidayName ?? guide.titleHebrew)}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                {
                  marginTop: spacing.xs,
                  color: theme.labelColor,
                  textAlign: 'right',
                },
              ]}
            >
              {guide.shortDescription}
            </Text>
            {approachingLabel ? (
              <Text
                style={[
                  typography.caption,
                  { marginTop: spacing.xs, color: theme.labelColor },
                ]}
              >
                {approachingLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {!expanded ? (
          <View
            style={{
              marginTop: spacing.md,
              borderRadius: borderRadius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              padding: spacing.sm,
            }}
          >
            {previewChecklist.map((item) => (
              <Text
                key={item.id}
                style={[
                  typography.bodySmall,
                  {
                    marginBottom: spacing.xs,
                    textAlign: 'right',
                    color: theme.textColor,
                  },
                ]}
              >
                ☐ {item.labelHebrew}
              </Text>
            ))}
          </View>
        ) : (
          <View
            style={{
              marginTop: spacing.md,
              borderRadius: borderRadius.lg,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: spacing.sm,
            }}
          >
            {renderSection(guide.overview, theme.textColor, theme.labelColor)}
            {guide.preparation.map((sectionData) =>
              renderSection(sectionData, theme.textColor, theme.labelColor),
            )}
            {guide.mitzvot.map((sectionData) =>
              renderSection(sectionData, theme.textColor, theme.labelColor),
            )}
            {guide.prayers?.map((sectionData) =>
              renderSection(sectionData, theme.textColor, theme.labelColor),
            )}

            {renderTipList(
              'טיפים מעשיים',
              guide.practicalTips,
              theme.textColor,
              theme.labelColor,
            )}

            {renderTipList(
              'טיפים למשפחה',
              guide.familyTips ?? [],
              theme.textColor,
              theme.labelColor,
            )}

            {renderTipList(
              'טעויות נפוצות',
              guide.commonMistakes ?? [],
              theme.textColor,
              theme.labelColor,
            )}

            <View style={{ marginTop: spacing.md }}>
              <Text
                style={[
                  typography.label,
                  { color: theme.textColor, textAlign: 'right', fontWeight: '600' },
                ]}
              >
                רשימת הכנה
              </Text>
              {guide.checklist.map((item) => (
                <Text
                  key={item.id}
                  style={[
                    typography.bodySmall,
                    {
                      marginTop: spacing.xs,
                      textAlign: 'right',
                      color: theme.textColor,
                    },
                  ]}
                >
                  ☐ {item.labelHebrew}
                </Text>
              ))}
            </View>

            {guide.commonQuestions && guide.commonQuestions.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={[
                    typography.label,
                    { color: theme.textColor, textAlign: 'right', fontWeight: '600' },
                  ]}
                >
                  שאלות נפוצות
                </Text>
                {guide.commonQuestions.map((entry) => (
                  <View key={entry.id} style={{ marginTop: spacing.sm }}>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: theme.textColor, textAlign: 'right', fontWeight: '600' },
                      ]}
                    >
                      {entry.questionHebrew}
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: theme.labelColor, textAlign: 'right', marginTop: 2 },
                      ]}
                    >
                      {entry.answerHebrew}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {guide.sources.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={[
                    typography.caption,
                    { color: theme.labelColor, textAlign: 'right' },
                  ]}
                >
                  מקורות:{' '}
                  {guide.sources
                    .slice(0, 3)
                    .map((entry) => formatContentSource(entry))
                    .join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {guide.practicalTips[0] && !expanded ? (
          <Text
            style={[
              typography.caption,
              {
                marginTop: spacing.sm,
                color: theme.labelColor,
                textAlign: 'right',
              },
            ]}
          >
            {guide.practicalTips[0].bodyHebrew}
          </Text>
        ) : null}

        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'הצג פחות' : 'מדריך מלא לחג'}
          style={{
            marginTop: spacing.md,
            alignSelf: 'flex-end',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              typography.bodySmall,
              {
                color: theme.textColor,
                fontWeight: '600',
              },
            ]}
          >
            {expanded ? 'הצג פחות' : 'מדריך מלא לחג ←'}
          </Text>
        </Pressable>
      </LinearGradient>
    </Card>
  );
}
