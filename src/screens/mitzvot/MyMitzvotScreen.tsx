import { useEffect, useState } from 'react';

import { Pressable, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';



import { MyMitzvotEditPanel } from '@/components/mitzvah/MyMitzvotEditPanel';

import { MitzvahListCard } from '@/components/mitzvah/MitzvahListCard';

import { ScreenContainer } from '@/components/common/ScreenContainer';

import { CATEGORY_LABELS } from '@/constants/mitzvot';

import { colors } from '@/constants/colors';

import { borderRadius, spacing, typography } from '@/constants/theme';

import type { RootStackParamList } from '@/navigation/types';

import type { MitzvahCategory } from '@/types/mitzvah';

import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import { useMitzvahStore } from '@/store/mitzvahStore';

import { useUserStore } from '@/store/userStore';



const CATEGORIES: MitzvahCategory[] = ['daily', 'fast', 'holiday'];



type NavigationProp = NativeStackNavigationProp<RootStackParamList>;



export function MyMitzvotScreen() {

  const navigation = useNavigation<NavigationProp>();

  const [isEditing, setIsEditing] = useState(false);



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



  if (!user) {

    return null;

  }



  const trackedMitzvot = trackedMitzvotForDiag;



  const handleOpenDetail = (mitzvahId: string) => {

    navigation.navigate('MitzvahDetail', { mitzvahId });

  };



  return (

    <ScreenContainer>

      <View

        className="mb-4 flex-row items-center justify-between"

        style={{ gap: spacing.sm }}

      >

        <Text style={typography.hero}>המצוות שלי</Text>

        {!isEditing ? (

          <Pressable

            onPress={() => setIsEditing(true)}

            accessibilityRole="button"

            accessibilityLabel="עריכת המצוות שלי"

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

        ) : null}

      </View>



      {isEditing ? (

        <MyMitzvotEditPanel

          userId={user.id}

          onClose={() => setIsEditing(false)}

        />

      ) : (

        <>

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

        </>

      )}

    </ScreenContainer>

  );

}

