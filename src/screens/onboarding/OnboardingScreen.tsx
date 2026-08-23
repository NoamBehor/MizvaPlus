import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CategoryTabs } from '@/components/onboarding/CategoryTabs';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { MitzvahPreferenceCard } from '@/components/mitzvah/MitzvahPreferenceCard';
import {
  CATEGORY_LABELS,
  ONBOARDING_CATEGORIES,
} from '@/constants/mitzvot';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { getMitzvotByCategory } from '@/services/mitzvot';
import { useAppStore } from '@/store/appStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import type { MitzvahCategory } from '@/types/mitzvah';

type OnboardingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Onboarding'
>;

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [activeCategory, setActiveCategory] = useState<MitzvahCategory>('daily');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const user = useUserStore((state) => state.user);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const preferences = useMitzvahStore((state) => state.preferences);
  const setTracking = useMitzvahStore((state) => state.setTracking);
  const setReminder = useMitzvahStore((state) => state.setReminder);
  const setReminderTime = useMitzvahStore((state) => state.setReminderTime);
  const persistPreferences = useMitzvahStore((state) => state.persistPreferences);

  const categoryMitzvot = getMitzvotByCategory(activeCategory);

  const handleFinish = async () => {
    if (!user) {
      setError('יש להתחבר כדי להמשיך');
      navigation.replace('Auth');
      return;
    }

    const hasEnabledMitzvah = Object.values(preferences).some(
      (preference) => preference.enabled,
    );

    if (!hasEnabledMitzvah) {
      setError('יש לבחור לפחות מצווה אחת למעקב');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await persistPreferences(user.id);
      await completeOnboarding(user.id);
      navigation.replace('Main');
    } catch {
      setError('שמירת ההעדפות נכשלה. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="mb-6">
        <Text style={typography.hero}>המצוות שלך</Text>
        <Text style={[typography.bodySmall, { marginTop: 8 }]}>
          בחר אילו מצוות תרצה לעקוב אחריהן ולקבל עליהן תזכורות.
        </Text>
      </View>

      <CategoryTabs
        categories={ONBOARDING_CATEGORIES}
        labels={CATEGORY_LABELS}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {categoryMitzvot.map((mitzvah) => {
        const preference = preferences[mitzvah.id];
        if (!preference) {
          return null;
        }

        return (
          <MitzvahPreferenceCard
            key={mitzvah.id}
            mitzvah={mitzvah}
            preference={preference}
            onTrackingChange={(enabled) => void setTracking(mitzvah.id, enabled)}
            onReminderChange={(enabled) => void setReminder(mitzvah.id, enabled)}
            onReminderTimeChange={(time) =>
              void setReminderTime(mitzvah.id, time)
            }
          />
        );
      })}

      {error ? (
        <View
          className="mb-4 rounded-xl p-3"
          style={{ backgroundColor: '#FFF5F5' }}
        >
          <Text style={[typography.bodySmall, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => void handleFinish()}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel="שמור והמשך"
        className="mt-2 items-center rounded-2xl py-4"
        style={{
          backgroundColor: colors.primary,
          opacity: isSaving ? 0.7 : 1,
          minHeight: 48,
        }}
      >
        <Text style={[typography.subtitle, { color: colors.white }]}>
          {isSaving ? 'שומר...' : 'שמור והמשך'}
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
