import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { MinyanLiveActions } from '@/components/map/MinyanLiveActions';
import { MinyanLiveSection } from '@/components/map/MinyanLiveSection';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import type { MinyanReportEligibility } from '@/utils/minyanReportEligibility';
import { formatDistanceMeters, formatWalkingEta } from '@/utils/distance';
import { synagogueNeedsMinyan } from '@/utils/mapSynagogues';
import { openSynagogueNavigation } from '@/utils/synagogueNavigation';

interface MapSelectedSynagogueCardProps {
  synagogue: Synagogue;
  minyan?: ActiveMinyanReport;
  isAuthenticated: boolean;
  isOwnedReport: boolean;
  isMinyanMutating: boolean;
  minyanMutationSynagogueOsmKey: string | null;
  minyanMutationError: string | null;
  minyanSuccessMessage: string | null;
  eligibility: MinyanReportEligibility;
  onCreateMinyan: (attendance: number) => Promise<boolean>;
  onUpdateMinyan: (reportId: string, attendance: number) => Promise<boolean>;
  onFulfillMinyan: (reportId: string) => Promise<boolean>;
  onClearMinyanMutationError: () => void;
  onClearMinyanSuccessMessage: () => void;
}

export function MapSelectedSynagogueCard({
  synagogue,
  minyan,
  isAuthenticated,
  isOwnedReport,
  isMinyanMutating,
  minyanMutationSynagogueOsmKey,
  minyanMutationError,
  minyanSuccessMessage,
  eligibility,
  onCreateMinyan,
  onUpdateMinyan,
  onFulfillMinyan,
  onClearMinyanMutationError,
  onClearMinyanSuccessMessage,
}: MapSelectedSynagogueCardProps) {
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const distanceLabel =
    typeof synagogue.distanceMeters === 'number'
      ? formatDistanceMeters(synagogue.distanceMeters)
      : null;
  const walkingEta =
    typeof synagogue.distanceMeters === 'number'
      ? formatWalkingEta(synagogue.distanceMeters)
      : null;
  const needsMinyan = synagogueNeedsMinyan(minyan);

  return (
    <View
      className="gap-3 rounded-2xl border p-3"
      style={{
        borderColor: needsMinyan ? colors.goldDeep : colors.primary,
        borderWidth: needsMinyan ? 2 : 1,
        backgroundColor: needsMinyan ? '#FFFBEB' : colors.surface,
      }}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          {minyan ? (
            <View className="mb-2 self-start rounded-full border px-2.5 py-1" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <Text
                style={[
                  typography.caption,
                  { color: '#92400E', fontWeight: '800' },
                ]}
              >
                מניין נדרש דחוף
              </Text>
            </View>
          ) : null}
          <Text style={[typography.subtitle, { fontSize: 20 }]}>{synagogue.name}</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>
            {[synagogue.address, synagogue.denomination].filter(Boolean).join(' • ')}
          </Text>
        </View>
        {distanceLabel ? (
          <Text
            style={[
              typography.label,
              { color: colors.goldDeep, fontWeight: '700' },
            ]}
          >
            {distanceLabel}
          </Text>
        ) : null}
      </View>

      {minyan ? <MinyanLiveSection minyan={minyan} /> : null}

      {walkingEta ? (
        <Text style={[typography.caption, { color: colors.muted }]}>{walkingEta}</Text>
      ) : null}

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
        className="items-center justify-center rounded-xl px-4 py-3"
        style={{
          backgroundColor: colors.primary,
          flexDirection: 'row-reverse',
          gap: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel="נווט לבית הכנסת"
      >
        <AppIcon name="navigate" size={16} color={colors.white} />
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
        actionsDisabled={!eligibility.canAttempt}
        disabledReason={eligibility.message}
        accuracyHint={eligibility.accuracyHint}
        onCreate={onCreateMinyan}
        onUpdate={onUpdateMinyan}
        onFulfill={onFulfillMinyan}
        onClearMutationError={onClearMinyanMutationError}
        onClearSuccessMessage={onClearMinyanSuccessMessage}
      />
    </View>
  );
}
