import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CATEGORY_LABELS, MITZVOT_SEED } from '@/constants/mitzvot';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import {
  navigateToHomeHolidayGuide,
  navigateToMitzvahDetail,
} from '@/navigation/navigationRef';
import type { RootStackParamList } from '@/navigation/types';
import { getHolidayGuide } from '@/services/holidayGuideService';
import {
  canOpenPrayerReader,
  getPrayerIdForMitzvah,
} from '@/services/texts/prayerContentService';
import {
  canOpenRitualGuide,
  getRitualGuideIdForMitzvah,
} from '@/services/texts/ritualContentService';
import type { Mitzvah } from '@/types/mitzvah';
import { getHolidayKeyForMitzvahId } from '@/utils/mitzvah';

const PREVIEW_CATEGORIES = ['fast', 'holiday'] as const;
const DEFAULT_NUSACH = 'edot_hamizrach' as const;

interface MitzvahPreviewMeta {
  mitzvah: Mitzvah;
  holidayKey: string | null;
  holidayGuideTitle: string | null;
  prayerId: string | null;
  prayerOpenable: boolean;
  ritualGuideId: string | null;
  ritualOpenable: boolean;
  caption: string;
}

function buildPreviewMeta(mitzvah: Mitzvah): MitzvahPreviewMeta {
  const holidayKey = getHolidayKeyForMitzvahId(mitzvah.id);
  const holidayGuide = holidayKey ? getHolidayGuide(holidayKey) : null;
  const prayerId = getPrayerIdForMitzvah(mitzvah.id);
  const prayerOpenable = prayerId ? canOpenPrayerReader(prayerId) : false;
  const ritualGuideId = getRitualGuideIdForMitzvah(mitzvah.id);
  const ritualOpenable = ritualGuideId
    ? canOpenRitualGuide(ritualGuideId)
    : false;

  const parts: string[] = [];
  if (holidayGuide) {
    parts.push(`מדריך: ${holidayGuide.titleHebrew}`);
  } else if (holidayKey) {
    parts.push('מדריך: —');
  }
  if (prayerOpenable && prayerId) {
    parts.push(`תפילה: ${prayerId}`);
  } else {
    parts.push('תפילה: —');
  }
  if (ritualOpenable) {
    parts.push('טקס: כן');
  }

  const hasPrimary =
    holidayGuide != null || prayerOpenable || ritualOpenable;
  const caption = hasPrimary ? parts.join(' · ') : 'אין פעולה ראשית';

  return {
    mitzvah,
    holidayKey: holidayKey ?? null,
    holidayGuideTitle: holidayGuide?.titleHebrew ?? null,
    prayerId: prayerOpenable && prayerId ? prayerId : null,
    prayerOpenable,
    ritualGuideId: ritualOpenable && ritualGuideId ? ritualGuideId : null,
    ritualOpenable,
    caption,
  };
}

function MitzvahPreviewRow({
  meta,
  navigation,
}: {
  meta: MitzvahPreviewMeta;
  navigation: NativeStackNavigationProp<RootStackParamList>;
}) {
  const { mitzvah, holidayKey, holidayGuideTitle, prayerId } = meta;

  return (
    <View
      className="mb-3 rounded-xl border px-3 py-3"
      style={{ borderColor: colors.border }}
    >
      <Text style={[typography.body, { marginBottom: 4 }]}>{mitzvah.title}</Text>
      <Text
        style={[
          typography.caption,
          { color: colors.muted, marginBottom: 8, writingDirection: 'ltr' },
        ]}
      >
        {meta.caption}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.muted, marginBottom: 8, writingDirection: 'ltr' },
        ]}
      >
        id: {mitzvah.id}
      </Text>

      <Pressable
        onPress={() => navigateToMitzvahDetail(mitzvah.id)}
        className="mb-2 items-center rounded-lg py-3"
        style={{ backgroundColor: colors.primary }}
        accessibilityRole="button"
        accessibilityLabel={`מסך הסבר ${mitzvah.title}`}
      >
        <Text style={[typography.body, { color: colors.white }]}>מסך הסבר</Text>
      </Pressable>

      <View className="flex-row flex-wrap gap-2">
        {holidayKey && holidayGuideTitle ? (
          <Pressable
            onPress={() => navigateToHomeHolidayGuide(holidayKey)}
            className="min-w-[44%] flex-1 items-center rounded-lg py-2"
            style={{ backgroundColor: colors.accent }}
            accessibilityRole="button"
            accessibilityLabel={`מדריך חג ${mitzvah.title}`}
          >
            <Text style={[typography.caption, { color: colors.white }]}>
              מדריך חג
            </Text>
          </Pressable>
        ) : null}
        {prayerId ? (
          <Pressable
            onPress={() =>
              navigation.navigate('PrayerReader', {
                prayerId,
                nusach: DEFAULT_NUSACH,
              })
            }
            className="min-w-[44%] flex-1 items-center rounded-lg py-2"
            style={{ backgroundColor: colors.secondary }}
            accessibilityRole="button"
            accessibilityLabel={`תפילה ${mitzvah.title}`}
          >
            <Text style={[typography.caption, { color: colors.white }]}>
              תפילה
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function DevMitzvahExplanationSection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const grouped = useMemo(() => {
    const byCategory: Record<'fast' | 'holiday', MitzvahPreviewMeta[]> = {
      fast: [],
      holiday: [],
    };

    for (const mitzvah of MITZVOT_SEED) {
      if (mitzvah.category !== 'fast' && mitzvah.category !== 'holiday') {
        continue;
      }
      byCategory[mitzvah.category].push(buildPreviewMeta(mitzvah));
    }

    return byCategory;
  }, []);

  if (!__DEV__) {
    return null;
  }

  return (
    <View
      className="mb-4 rounded-2xl border p-4"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Text style={[typography.subtitle, { marginBottom: 4 }]}>
        מצוות — מסך הסבר (צומות וחגים)
      </Text>
      <Text style={[typography.caption, { color: colors.muted, marginBottom: 12 }]}>
        קיצורי דרך לנתיבי production לבדיקת תוכן ומעבר למדריך חג / תפילה.
      </Text>

      {PREVIEW_CATEGORIES.map((category) => (
        <View key={category} className="mb-2">
          <Text style={[typography.label, { marginBottom: 8, marginTop: 4 }]}>
            {CATEGORY_LABELS[category]}
          </Text>
          {grouped[category].map((meta) => (
            <MitzvahPreviewRow
              key={meta.mitzvah.id}
              meta={meta}
              navigation={navigation}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
