import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { BADGE_DEFINITIONS } from '@/constants/badges';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { useGamificationStore } from '@/store/gamificationStore';

export function BadgeGrid() {
  const badges = useGamificationStore((state) => state.badges);
  const unlockedIds = new Set(badges.map((b) => b.badgeId));

  return (
    <View className="gap-3">
      {BADGE_DEFINITIONS.map((badge) => {
        const isUnlocked = unlockedIds.has(badge.id);
        const userBadge = badges.find((b) => b.badgeId === badge.id);

        return (
          <Card
            key={badge.id}
            className="flex-row items-center"
          >
            <View
              className="mr-3 h-12 w-12 items-center justify-center rounded-full"
              style={{
                backgroundColor: isUnlocked ? colors.accent + '20' : colors.border,
                opacity: isUnlocked ? 1 : 0.5,
              }}
            >
              <Text style={{ fontSize: 24 }}>
                {isUnlocked ? badge.icon : '🔒'}
              </Text>
            </View>

            <View className="flex-1">
              <Text
                style={[
                  typography.subtitle,
                  { opacity: isUnlocked ? 1 : 0.5 },
                ]}
              >
                {badge.titleHebrew}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  { marginTop: 2, opacity: isUnlocked ? 1 : 0.5 },
                ]}
              >
                {badge.descriptionHebrew}
              </Text>
              {isUnlocked && userBadge ? (
                <Text style={[typography.caption, { marginTop: 4 }]}>
                  נפתח ב-
                  {new Date(userBadge.unlockedAt).toLocaleDateString('he-IL')}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}
