import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { MinyanLiveActions } from '@/components/map/MinyanLiveActions';
import { MinyanLiveSection } from '@/components/map/MinyanLiveSection';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { formatDistanceMeters } from '@/utils/distance';
import { openSynagogueNavigation } from '@/utils/synagogueNavigation';

interface SynagogueListCardProps {
  synagogue: Synagogue;
  selected: boolean;
  onPress: (synagogue: Synagogue) => void;
  minyan?: ActiveMinyanReport;
  isAuthenticated?: boolean;
  isOwnedReport?: boolean;
  isMinyanMutating?: boolean;
  minyanMutationSynagogueOsmKey?: string | null;
  minyanMutationError?: string | null;
  minyanSuccessMessage?: string | null;
  onCreateMinyan?: (attendance: number) => Promise<boolean>;
  onUpdateMinyan?: (reportId: string, attendance: number) => Promise<boolean>;
  onFulfillMinyan?: (reportId: string) => Promise<boolean>;
  onClearMinyanMutationError?: () => void;
  onClearMinyanSuccessMessage?: () => void;
}

export function SynagogueListCard({
  synagogue,
  selected,
  onPress,
  minyan,
  isAuthenticated = false,
  isOwnedReport = false,
  isMinyanMutating = false,
  minyanMutationSynagogueOsmKey = null,
  minyanMutationError = null,
  minyanSuccessMessage = null,
  onCreateMinyan,
  onUpdateMinyan,
  onFulfillMinyan,
  onClearMinyanMutationError,
  onClearMinyanSuccessMessage,
}: SynagogueListCardProps) {
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const distanceLabel =
    typeof synagogue.distanceMeters === 'number'
      ? formatDistanceMeters(synagogue.distanceMeters)
      : null;

  const prayerSummary =
    synagogue.prayerTimes && synagogue.prayerTimes.length > 0
      ? synagogue.prayerTimes
          .slice(0, 3)
          .map((time) => `${time.name} ${time.time}`)
          .join(' · ')
      : null;

  const showMinyanActions =
    selected &&
    onCreateMinyan &&
    onUpdateMinyan &&
    onFulfillMinyan &&
    onClearMinyanMutationError &&
    onClearMinyanSuccessMessage;

  return (
    <Pressable onPress={() => onPress(synagogue)} accessibilityRole="button">
      <Card
        className="mb-3"
        elevated={Boolean(minyan)}
        style={
          selected || minyan
            ? {
                borderColor: colors.accent,
                borderWidth: selected ? 2 : 1,
                backgroundColor: colors.surface,
                borderRightWidth: 4,
              }
            : {
                borderRightWidth: 3,
                borderRightColor: colors.primary,
              }
        }
      >
        <View className="gap-1">
          {minyan ? (
            <View
              className="mb-2 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.accent, fontWeight: '800' },
                ]}
              >
                מניין פעיל · חסרים {minyan.missingCount}
              </Text>
            </View>
          ) : null}
          <Text
            style={[typography.subtitle, { textAlign: 'right', writingDirection: 'rtl' }]}
          >
            {synagogue.name}
          </Text>
          <Text
            style={[typography.bodySmall, { textAlign: 'right', writingDirection: 'rtl' }]}
          >
            {synagogue.address}
          </Text>

          {minyan ? (
            <View className="mt-2">
              <MinyanLiveSection minyan={minyan} compact={!selected} />
            </View>
          ) : null}

          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {distanceLabel ? (
              <Text style={[typography.label, { color: colors.accent }]}>
                {distanceLabel}
              </Text>
            ) : null}

            {synagogue.denomination ? (
              <Text style={typography.caption}>{synagogue.denomination}</Text>
            ) : null}

            {synagogue.hasMinyan ? (
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.success,
                    fontWeight: '600',
                  },
                ]}
              >
                יש מניין
              </Text>
            ) : null}
          </View>

          {prayerSummary ? (
            <Text style={[typography.caption, { marginTop: 4 }]}>
              {prayerSummary}
            </Text>
          ) : null}

          {selected ? (
            <View className="mt-2 gap-1">
              <Pressable
                onPress={() => {
                  setNavigationError(null);
                  void openSynagogueNavigation({
                    name: synagogue.name,
                    coordinates: synagogue.coordinates,
                  }).then((result) => {
                    if (!result.opened) {
                      setNavigationError('לא ניתן לפתוח ניווט כרגע.');
                    }
                  });
                }}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: colors.primary }}
                accessibilityRole="button"
                accessibilityLabel="נווט לבית הכנסת"
              >
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: '700',
                    textAlign: 'center',
                    writingDirection: 'rtl',
                  }}
                >
                  נווט לבית הכנסת
                </Text>
              </Pressable>
              {navigationError ? (
                <Text style={[typography.caption, { color: colors.error }]}>
                  {navigationError}
                </Text>
              ) : null}
            </View>
          ) : null}

          {showMinyanActions ? (
            <MinyanLiveActions
              synagogueOsmKey={synagogue.id}
              synagogueName={synagogue.name}
              minyan={minyan}
              isAuthenticated={isAuthenticated}
              isOwnedReport={isOwnedReport}
              isMutating={isMinyanMutating}
              mutationSynagogueOsmKey={minyanMutationSynagogueOsmKey}
              mutationError={minyanMutationError}
              successMessage={minyanSuccessMessage}
              onCreate={onCreateMinyan}
              onUpdate={onUpdateMinyan}
              onFulfill={onFulfillMinyan}
              onClearMutationError={onClearMinyanMutationError}
              onClearSuccessMessage={onClearMinyanSuccessMessage}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
