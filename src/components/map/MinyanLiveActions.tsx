import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MinyanAttendanceInput } from '@/components/map/MinyanAttendanceInput';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';

interface MinyanLiveActionsProps {
  synagogueOsmKey: string;
  synagogueName: string;
  minyan?: ActiveMinyanReport;
  isAuthenticated: boolean;
  isOwnedReport: boolean;
  isMutating: boolean;
  mutationSynagogueOsmKey: string | null;
  mutationError: string | null;
  successMessage: string | null;
  actionsDisabled?: boolean;
  disabledReason?: string | null;
  accuracyHint?: string | null;
  onCreate: (attendance: number) => Promise<boolean>;
  onUpdate: (reportId: string, attendance: number) => Promise<boolean>;
  onFulfill: (reportId: string) => Promise<boolean>;
  onClearMutationError: () => void;
  onClearSuccessMessage: () => void;
}

type ActionMode = 'idle' | 'create' | 'update';

export function MinyanLiveActions({
  synagogueOsmKey,
  synagogueName,
  minyan,
  isAuthenticated,
  isOwnedReport,
  isMutating,
  mutationSynagogueOsmKey,
  mutationError,
  successMessage,
  actionsDisabled = false,
  disabledReason = null,
  accuracyHint = null,
  onCreate,
  onUpdate,
  onFulfill,
  onClearMutationError,
  onClearSuccessMessage,
}: MinyanLiveActionsProps) {
  const [mode, setMode] = useState<ActionMode>('idle');
  const isBusyForThisSynagogue =
    isMutating && mutationSynagogueOsmKey === synagogueOsmKey;

  useEffect(() => {
    if (successMessage) {
      setMode('idle');
    }
  }, [successMessage]);

  useEffect(() => {
    if (actionsDisabled) {
      setMode('idle');
    }
  }, [actionsDisabled]);

  if (!isAuthenticated) {
    return (
      <Text style={[typography.caption, { color: colors.muted, marginTop: 8 }]}>
        התחברו כדי לדווח על מניין או לסמן שאתם מגיעים.
      </Text>
    );
  }

  const ownsActiveReport = Boolean(minyan && isOwnedReport);

  return (
    <View className="mt-3 gap-2">
      {successMessage ? (
        <Text style={[typography.bodySmall, { color: colors.success, fontWeight: '600' }]}>
          {successMessage}
        </Text>
      ) : null}

      {mutationError ? (
        <View className="gap-2">
          <Text style={[typography.bodySmall, { color: colors.error }]}>
            {mutationError}
          </Text>
          <Pressable onPress={onClearMutationError} accessibilityRole="button">
            <Text style={[typography.caption, { color: colors.secondary }]}>
              סגירה
            </Text>
          </Pressable>
        </View>
      ) : null}

      {accuracyHint && !actionsDisabled ? (
        <Text style={[typography.caption, { color: colors.goldDeep }]}>
          {accuracyHint}
        </Text>
      ) : null}

      {actionsDisabled && disabledReason ? (
        <Text style={[typography.bodySmall, { color: colors.muted }]}>
          {disabledReason}
        </Text>
      ) : null}

      {!actionsDisabled && mode === 'idle' ? (
        <View className="gap-2">
          {minyan && !ownsActiveReport ? (
            <Pressable
              onPress={() => {
                onClearSuccessMessage();
                onClearMutationError();
                void onFulfill(minyan.id);
              }}
              disabled={isMutating}
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: colors.goldDeep,
                opacity: isMutating ? 0.7 : 1,
              }}
              accessibilityRole="button"
            >
              {isBusyForThisSynagogue ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: '700',
                    textAlign: 'center',
                    writingDirection: 'rtl',
                  }}
                >
                  אני מגיע
                </Text>
              )}
            </Pressable>
          ) : null}

          {minyan && ownsActiveReport ? (
            <Pressable
              onPress={() => {
                onClearSuccessMessage();
                onClearMutationError();
                setMode('update');
              }}
              disabled={isMutating}
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: colors.goldDeep,
                opacity: isMutating ? 0.7 : 1,
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: colors.white,
                  fontWeight: '700',
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}
              >
                עדכון המניין
              </Text>
            </Pressable>
          ) : null}

          {!minyan ? (
            <Pressable
              onPress={() => {
                onClearSuccessMessage();
                onClearMutationError();
                setMode('create');
              }}
              disabled={isMutating}
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: colors.goldDeep,
                opacity: isMutating ? 0.7 : 1,
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: colors.white,
                  fontWeight: '700',
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}
              >
                צריך מניין
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!actionsDisabled && mode === 'create' ? (
        <View className="gap-2">
          <Text style={typography.caption}>{synagogueName}</Text>
          <MinyanAttendanceInput
            disabled={isBusyForThisSynagogue}
            submitLabel={isBusyForThisSynagogue ? 'שולח...' : 'פרסום בקשת מניין'}
            onSubmit={(attendance) => {
              void onCreate(attendance).then((success) => {
                if (success) {
                  setMode('idle');
                }
              });
            }}
          />
          <Pressable
            onPress={() => setMode('idle')}
            disabled={isBusyForThisSynagogue}
            accessibilityRole="button"
          >
            <Text style={[typography.caption, { textAlign: 'center', color: colors.muted }]}>
              ביטול
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!actionsDisabled && mode === 'update' && minyan ? (
        <View className="gap-2">
          <MinyanAttendanceInput
            initialValue={minyan.currentAttendance}
            disabled={isBusyForThisSynagogue}
            submitLabel={isBusyForThisSynagogue ? 'מעדכן...' : 'עדכון המניין'}
            onSubmit={(attendance) => {
              void onUpdate(minyan.id, attendance).then((success) => {
                if (success) {
                  setMode('idle');
                }
              });
            }}
          />
          <Pressable
            onPress={() => setMode('idle')}
            disabled={isBusyForThisSynagogue}
            accessibilityRole="button"
          >
            <Text style={[typography.caption, { textAlign: 'center', color: colors.muted }]}>
              ביטול
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
