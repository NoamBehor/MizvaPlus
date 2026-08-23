import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MitzvahListCard } from '@/components/mitzvah/MitzvahListCard';
import { MitzvahPreferenceCard } from '@/components/mitzvah/MitzvahPreferenceCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { CATEGORY_LABELS } from '@/constants/mitzvot';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { getMitzvotByCategory } from '@/services/mitzvot';
import type { RootStackParamList } from '@/navigation/types';
import type { MitzvahCategory } from '@/types/mitzvah';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

const CATEGORIES: MitzvahCategory[] = ['daily', 'fast', 'holiday'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function MyMitzvotScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showManage, setShowManage] = useState(false);

  const user = useUserStore((state) => state.user);
  const preferences = useMitzvahStore((state) => state.preferences);
  const setTracking = useMitzvahStore((state) => state.setTracking);
  const setReminder = useMitzvahStore((state) => state.setReminder);
  const setReminderTime = useMitzvahStore((state) => state.setReminderTime);
  const isCompletedToday = useMitzvahStore((state) => state.isCompletedToday);
  const getEnabledTrackedMitzvot = useMitzvahStore(
    (state) => state.getEnabledTrackedMitzvot,
  );

  if (!user) {
    return null;
  }

  const trackedMitzvot = getEnabledTrackedMitzvot();

  const handleOpenDetail = (mitzvahId: string) => {
    navigation.navigate('MitzvahDetail', { mitzvahId });
  };

  return (
    <ScreenContainer>
      <Text style={[typography.hero, { marginBottom: 16 }]}>המצוות שלי</Text>

      {trackedMitzvot.length === 0 ? (
        <View className="mb-6 items-center rounded-2xl border border-border bg-surface p-6">
          <Text style={[typography.subtitle, { textAlign: 'center' }]}>
            עדיין לא בחרת מצוות למעקב
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { textAlign: 'center', marginTop: 8 },
            ]}
          >
            הפעל מעקב על מצוות כדי לראות אותן כאן.
          </Text>
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
              <Text style={[typography.subtitle, { marginBottom: 12 }]}>
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

      <Pressable
        onPress={() => setShowManage((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="נהל מצוות"
        className="mb-4 items-center rounded-2xl py-3"
        style={{
          backgroundColor: colors.border,
          minHeight: 48,
        }}
      >
        <Text style={typography.label}>
          {showManage ? 'הסתר הגדרות' : 'נהל מצוות והעדפות'}
        </Text>
      </Pressable>

      {showManage
        ? CATEGORIES.map((category) => {
            const mitzvot = getMitzvotByCategory(category);

            return (
              <View key={`manage-${category}`} className="mb-6">
                <Text style={[typography.subtitle, { marginBottom: 12 }]}>
                  {CATEGORY_LABELS[category]}
                </Text>

                {mitzvot.map((mitzvah) => {
                  const preference = preferences[mitzvah.id];
                  if (!preference) {
                    return null;
                  }

                  return (
                    <MitzvahPreferenceCard
                      key={mitzvah.id}
                      mitzvah={mitzvah}
                      preference={preference}
                      onTrackingChange={(enabled) =>
                        void setTracking(mitzvah.id, enabled)
                      }
                      onReminderChange={(enabled) =>
                        void setReminder(mitzvah.id, enabled)
                      }
                      onReminderTimeChange={(time) =>
                        void setReminderTime(mitzvah.id, time)
                      }
                    />
                  );
                })}
              </View>
            );
          })
        : null}
    </ScreenContainer>
  );
}
