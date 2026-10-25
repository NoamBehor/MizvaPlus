import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { MitzvahListCard } from '@/components/mitzvah/MitzvahListCard';
import { MyMitzvotEditPanel } from '@/components/mitzvah/MyMitzvotEditPanel';
import { CATEGORY_LABELS } from '@/constants/mitzvot';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import type { MitzvahCategory } from '@/types/mitzvah';

const CATEGORIES: MitzvahCategory[] = ['daily', 'fast', 'holiday'];

type MyMitzvotScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MyMitzvot'
>;

export function MyMitzvotScreen({ navigation, route }: MyMitzvotScreenProps) {
  const openEdit = route.params?.openEdit === true;
  const [isEditing, setIsEditing] = useState(openEdit);

  useEffect(() => {
    if (openEdit) {
      setIsEditing(true);
    }
  }, [openEdit]);

  const user = useUserStore((state) => state.user);
  const isCompletedToday = useMitzvahStore((state) => state.isCompletedToday);
  const getEnabledTrackedMitzvot = useMitzvahStore(
    (state) => state.getEnabledTrackedMitzvot,
  );
  const preferencesRevision = useMitzvahStore((state) => state.preferencesRevision);
  const trackedMitzvotForDiag = getEnabledTrackedMitzvot();

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const selectedIds = trackedMitzvotForDiag.map((mitzvah) => mitzvah.id);
    const existing = useDiagnosticsStore.getState().myMitzvot;
    useDiagnosticsStore.getState().setMyMitzvotSnapshot({
      selectedMitzvahIds: selectedIds,
      selectionCount: selectedIds.length,
      preferencesRevision,
      lastSavedRevision: existing?.lastSavedRevision ?? null,
      lastSaveStatus: existing?.lastSaveStatus ?? null,
      lastSaveTimestamp: existing?.lastSaveTimestamp ?? null,
      lastSaveWasNoop: existing?.lastSaveWasNoop ?? null,
      notificationReconciliationStatus:
        existing?.notificationReconciliationStatus ?? null,
      homeRefreshTriggered: existing?.homeRefreshTriggered ?? null,
    });
  }, [trackedMitzvotForDiag, preferencesRevision]);

  const handleCloseEditor = useCallback(() => {
    navigation.navigate('Main', { screen: 'Home' });
  }, [navigation]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCloseEditor();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleCloseEditor, isEditing]);

  if (!user) {
    return null;
  }

  const trackedMitzvot = trackedMitzvotForDiag;

  const handleOpenDetail = (mitzvahId: string) => {
    navigation.navigate('MitzvahDetail', { mitzvahId });
  };

  if (isEditing) {
    return (
      <ScreenContainer scrollable={false} horizontalPadding={0}>
        <MyMitzvotEditPanel
          userId={user.id}
          onClose={handleCloseEditor}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View
        className="mb-4 flex-row items-center justify-between"
        style={{ gap: spacing.sm }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={typography.label}>→ חזרה</Text>
        </Pressable>
        <Text style={[typography.hero, { fontSize: 24, flex: 1 }]}>המצוות שלי</Text>
        <Pressable
          onPress={() => setIsEditing(true)}
          accessibilityRole="button"
          accessibilityLabel="עריכת המצוות שלי"
          testID="my-mitzvot-edit"
          className="rounded-xl px-4 py-2"
          style={{
            backgroundColor: colors.primary,
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: borderRadius.md,
          }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            עריכת המצוות שלי
          </Text>
        </Pressable>
      </View>

      {trackedMitzvot.length === 0 ? (
        <View
          className="mb-6 items-center rounded-2xl border border-border bg-surface p-6"
          style={{ borderRadius: borderRadius.lg }}
        >
          <Text style={[typography.subtitle, { textAlign: 'center' }]}>
            עדיין לא בחרת מצוות למעקב
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            לחצו על "עריכת המצוות שלי" כדי לבחור מצוות, חגים ותזכורות.
          </Text>
          <Pressable
            onPress={() => setIsEditing(true)}
            accessibilityRole="button"
            className="mt-4 rounded-xl px-5 py-3"
            style={{ backgroundColor: colors.accent, minHeight: 48 }}
          >
            <Text style={[typography.label, { color: colors.white }]}>
              עריכת המצוות שלי
            </Text>
          </Pressable>
        </View>
      ) : (
        CATEGORIES.map((category) => {
          const categoryMitzvot = trackedMitzvot.filter(
            (mitzvah) => mitzvah.category === category,
          );

          if (categoryMitzvot.length === 0) {
            return null;
          }

          return (
            <View key={category} className="mb-6">
              <Text style={[typography.subtitle, { marginBottom: spacing.md }]}>
                {CATEGORY_LABELS[category]}
              </Text>

              {categoryMitzvot.map((mitzvah) => (
                <MitzvahListCard
                  key={mitzvah.id}
                  mitzvah={mitzvah}
                  isCompleted={isCompletedToday(user.id, mitzvah.id)}
                  onPress={() => handleOpenDetail(mitzvah.id)}
                />
              ))}
            </View>
          );
        })
      )}
    </ScreenContainer>
  );
}
