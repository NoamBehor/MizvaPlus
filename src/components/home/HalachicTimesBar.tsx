import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { HomeSheet } from '@/components/home/HomeSheet';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { ltrLayoutStyle } from '@/constants/layoutDirection';
import { spacing, typography } from '@/constants/theme';
import type { DailyHalachicTime } from '@/services/calendar/dailyZmanim';

interface HalachicTimesBarProps {
  times: DailyHalachicTime[];
  calculationNote: string;
  locationLabel: string;
  isLoading?: boolean;
}

function nextTimeId(times: DailyHalachicTime[], nowMs: number): string | null {
  const upcoming = times.find((time) => time.at.getTime() > nowMs);
  return upcoming?.id ?? times[times.length - 1]?.id ?? null;
}

export function HalachicTimesBar({
  times,
  calculationNote,
  locationLabel,
  isLoading = false,
}: HalachicTimesBarProps) {
  const fontsLoaded = useHomeFonts();
  const [expanded, setExpanded] = useState(false);
  const activeId = useMemo(() => nextTimeId(times, Date.now()), [times]);

  return (
    <View style={{ marginBottom: homeTheme.sectionGap, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name="clock" size={14} color={homeTheme.primary} />
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: homeTheme.text },
            ]}
          >
            זמני היום (הלכתיים)
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="לכל הזמנים"
          onPress={() => setExpanded(true)}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: homeTheme.primary },
            ]}
          >
            לכל הזמנים
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Text accessibilityRole="text" accessibilityLabel="טוען זמני היום" style={typography.caption}>
          טוען זמנים...
        </Text>
      ) : times.length === 0 ? (
        <Text style={[typography.bodySmall, { color: homeTheme.muted }]}>
          זמנים לא זמינים כרגע
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ direction: 'rtl' }}
          contentContainerStyle={{ direction: 'rtl', gap: 10, paddingVertical: 4 }}
          accessibilityLabel={`${calculationNote} ${locationLabel}`}
        >
          {times.map((time) => {
            const active = time.id === activeId;
            return (
              <View
                key={time.id}
                accessibilityRole="text"
                accessibilityLabel={`${time.label} ${time.displayTime}${active ? ', הזמן הבא' : ''}`}
                style={{
                  minWidth: 90,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: active ? homeTheme.primarySoft : homeTheme.surface,
                  borderWidth: 1,
                  borderColor: active ? homeTheme.primaryBorder : 'rgba(226, 232, 240, 0.9)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {active ? (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: homeTheme.primary,
                      }}
                    />
                  ) : null}
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? '#1E3A8A' : homeTheme.muted, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {time.label}
                  </Text>
                </View>
                <View style={ltrLayoutStyle}>
                  <Text
                    style={[
                      typography.bodySmall,
                      homeFontStyle(fontsLoaded, homeFonts.bold),
                      {
                        color: active ? homeTheme.primary : homeTheme.text,
                        fontVariant: ['tabular-nums'],
                        textAlign: 'right',
                      },
                    ]}
                  >
                    {time.displayTime}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <HomeSheet visible={expanded} title="כל הזמנים" onClose={() => setExpanded(false)}>
        <Text style={[typography.caption, { color: homeTheme.muted }]}>
          {calculationNote} {locationLabel}
        </Text>
        {times.map((time) => (
          <View
            key={time.id}
            accessibilityRole="text"
            accessibilityLabel={`${time.label} ${time.displayTime}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 44,
            }}
          >
            <Text style={[typography.label, { color: homeTheme.text }]}>{time.label}</Text>
            <Text style={[typography.label, { color: homeTheme.text, fontVariant: ['tabular-nums'] }]}>
              {time.displayTime}
            </Text>
          </View>
        ))}
      </HomeSheet>
    </View>
  );
}
