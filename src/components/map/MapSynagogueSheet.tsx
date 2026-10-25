import { Pressable, Text, View } from 'react-native';

import { LoadingPanel, MapStatePanel } from '@/components/map/MapStatePanel';
import { MapSelectedSynagogueCard } from '@/components/map/MapSelectedSynagogueCard';
import { SynagogueListCard } from '@/components/map/SynagogueListCard';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { SynagogueWithMinyan } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import type { MinyanReportEligibility } from '@/utils/minyanReportEligibility';
import type { UserLocation } from '@/types/location';
import { getMinyanReportEligibility } from '@/utils/minyanReportEligibility';

interface MapSynagogueSheetProps {
  location: UserLocation | null;
  selectedSynagogue: SynagogueWithMinyan | null;
  nearbySynagogues: SynagogueWithMinyan[];
  displayedSynagogues: SynagogueWithMinyan[];
  totalCount: number;
  isSynagoguesLoading: boolean;
  synagoguesError: string | null;
  isEmpty: boolean;
  emptyDescription: string;
  cacheNotice: string | null;
  isStaleCache: boolean;
  isAuthenticated: boolean;
  isMinyanLiveLoading: boolean;
  minyanLiveLoadError: string | null;
  isMinyanMutating: boolean;
  minyanMutationSynagogueOsmKey: string | null;
  minyanMutationError: string | null;
  minyanSuccessMessage: string | null;
  isOwnedReport: (synagogueOsmKey: string, reportId: string) => boolean;
  onRetrySynagogues: () => void;
  onRetryAll: () => void;
  onFocusSynagogue: (synagogue: Synagogue) => void;
  onCreateMinyan: (attendance: number) => Promise<boolean>;
  onUpdateMinyan: (reportId: string, attendance: number) => Promise<boolean>;
  onFulfillMinyan: (reportId: string) => Promise<boolean>;
  onClearMinyanMutationError: () => void;
  onClearMinyanSuccessMessage: () => void;
}

function selectedEligibility(
  location: UserLocation | null,
  synagogue: SynagogueWithMinyan | null,
): MinyanReportEligibility {
  return getMinyanReportEligibility({
    location,
    distanceMeters: synagogue?.distanceMeters,
  });
}

export function MapSynagogueSheet({
  location,
  selectedSynagogue,
  nearbySynagogues,
  displayedSynagogues,
  totalCount,
  isSynagoguesLoading,
  synagoguesError,
  isEmpty,
  emptyDescription,
  cacheNotice,
  isStaleCache,
  isAuthenticated,
  isMinyanLiveLoading,
  minyanLiveLoadError,
  isMinyanMutating,
  minyanMutationSynagogueOsmKey,
  minyanMutationError,
  minyanSuccessMessage,
  isOwnedReport,
  onRetrySynagogues,
  onRetryAll,
  onFocusSynagogue,
  onCreateMinyan,
  onUpdateMinyan,
  onFulfillMinyan,
  onClearMinyanMutationError,
  onClearMinyanSuccessMessage,
}: MapSynagogueSheetProps) {
  const eligibility = selectedEligibility(location, selectedSynagogue);

  return (
    <View className="px-5 pb-3 pt-4" style={{ backgroundColor: colors.surface }}>
      {isSynagoguesLoading ? (
        <View style={{ minHeight: 160 }}>
          <LoadingPanel message="מחפש בתי כנסת בסביבה..." />
        </View>
      ) : null}

      {!isSynagoguesLoading && synagoguesError ? (
        <View style={{ minHeight: 180 }}>
          <MapStatePanel
            title="לא הצלחנו לטעון בתי כנסת כרגע"
            description="החיפוש משתמש ב-OpenStreetMap (Overpass), לא ב-Google Maps. כשל באריחי המפה אינו אותה בעיה."
            actionLabel="נסו שוב"
            onAction={onRetrySynagogues}
          />
        </View>
      ) : null}

      {!isSynagoguesLoading && !synagoguesError && isEmpty ? (
        <View style={{ minHeight: 180 }}>
          <MapStatePanel
            title="לא נמצאו בתי כנסת באזור"
            description={emptyDescription}
            actionLabel="רענון"
            onAction={onRetryAll}
          />
        </View>
      ) : null}

      {!isSynagoguesLoading && !synagoguesError && selectedSynagogue ? (
        <View>
          <Text
            style={[
              typography.label,
              { fontWeight: '700', color: colors.text, marginBottom: 12 },
            ]}
          >
            {totalCount === 1
              ? 'בית הכנסת הקרוב ביותר'
              : `${totalCount} בתי הכנסת הקרובים ביותר`}
          </Text>
          <MapSelectedSynagogueCard
            synagogue={selectedSynagogue}
            minyan={selectedSynagogue.minyan}
            isAuthenticated={isAuthenticated}
            isOwnedReport={
              selectedSynagogue.minyan
                ? isOwnedReport(selectedSynagogue.id, selectedSynagogue.minyan.id)
                : false
            }
            isMinyanMutating={isMinyanMutating}
            minyanMutationSynagogueOsmKey={minyanMutationSynagogueOsmKey}
            minyanMutationError={minyanMutationError}
            minyanSuccessMessage={minyanSuccessMessage}
            eligibility={eligibility}
            onCreateMinyan={onCreateMinyan}
            onUpdateMinyan={onUpdateMinyan}
            onFulfillMinyan={onFulfillMinyan}
            onClearMinyanMutationError={onClearMinyanMutationError}
            onClearMinyanSuccessMessage={onClearMinyanSuccessMessage}
          />

          {cacheNotice ? (
            <Text style={[typography.caption, { color: colors.muted, marginTop: 8 }]}>
              {cacheNotice}
            </Text>
          ) : null}
          {isStaleCache ? (
            <Pressable onPress={onRetrySynagogues} accessibilityRole="button">
              <Text style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>
                נסו שוב לטעון נתונים חיים
              </Text>
            </Pressable>
          ) : null}
          {isAuthenticated && isMinyanLiveLoading ? (
            <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
              מעדכן מצב מניינים...
            </Text>
          ) : null}
          {isAuthenticated && minyanLiveLoadError ? (
            <Text style={[typography.caption, { color: colors.error, marginTop: 4 }]}>
              {minyanLiveLoadError}
            </Text>
          ) : null}

          {nearbySynagogues.length > 0 ? (
            <View className="mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <View className="gap-2.5">
                {nearbySynagogues.map((item) => {
                  const rank = displayedSynagogues.findIndex(
                    (synagogue) => synagogue.id === item.id,
                  ) + 1;

                  return (
                    <SynagogueListCard
                      key={item.id}
                      synagogue={item}
                      rank={rank > 0 ? rank : undefined}
                      selected={item.id === selectedSynagogue.id}
                      minyan={item.minyan}
                      onPress={onFocusSynagogue}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
