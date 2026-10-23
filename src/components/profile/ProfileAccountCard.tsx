import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon } from '@/components/common/AppIcon';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
import { spacing, typography } from '@/constants/theme';

interface ProfileAccountCardProps {
  displayName: string;
  email: string;
  isGuest: boolean;
  onEditPress: () => void;
}

export function ProfileAccountCard({
  displayName,
  email,
  isGuest,
  onEditPress,
}: ProfileAccountCardProps) {
  const fontsLoaded = useHomeFonts();
  const trimmedName = displayName.trim();
  const name = trimmedName || (isGuest ? 'משתמש אורח' : 'משתמש');
  const initials = getInitials(trimmedName);
  const emailLabel = email.trim() || '—';
  const connectionLabel = isGuest ? 'מחובר כאורח' : 'מחובר';

  return (
    <Card elevated style={cardStyle}>
      <View
        accessibilityRole="summary"
        accessibilityLabel={`${name}, ${emailLabel}, ${connectionLabel}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View>
          <LinearGradient
            colors={[profileTheme.brandDark, profileTheme.brand]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={avatar}
          >
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.bold),
                { color: colors.white, fontSize: 16 },
              ]}
            >
              {initials}
            </Text>
          </LinearGradient>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              presenceDot,
              { backgroundColor: isGuest ? '#F59E0B' : homeTheme.success },
            ]}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: homeTheme.text, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
            ]}
          >
            {name}
          </Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>{emailLabel}</Text>
          <View style={connectionChip}>
            <Text style={[typography.caption, { color: homeTheme.muted, fontSize: 10 }]}>
              {connectionLabel}
            </Text>
          </View>
        </View>
        </View>

        <Pressable
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel="עריכת פרופיל"
          accessibilityHint={isGuest ? 'מעבר להתחברות לחשבון' : 'שינוי שם תצוגה'}
          style={({ pressed }) => [editButton, pressed && { opacity: 0.85 }]}
        >
          <AppIcon name="pencil" size={14} color={profileTheme.brand} />
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: profileTheme.brand, fontSize: 12 },
            ]}
          >
            עריכה
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function getInitials(displayName: string): string {
  const parts = displayName.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
  }
  const compact = displayName.replace(/\s+/g, '');
  if (compact.length === 0) {
    return 'מ';
  }
  return compact.slice(0, 2);
}

const cardStyle = {
  backgroundColor: colors.white,
  borderColor: '#F1F5F9',
  borderRadius: homeTheme.cardRadius,
  marginBottom: 0,
};

const avatar = {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 2,
  borderColor: profileTheme.brandBorder,
};

const editButton = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: profileTheme.brandBorder,
  backgroundColor: profileTheme.brandSoft,
  minHeight: 44,
  justifyContent: 'center' as const,
};

const presenceDot = {
  position: 'absolute' as const,
  bottom: 0,
  right: 0,
  width: 12,
  height: 12,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: colors.white,
};

const connectionChip = {
  alignSelf: 'flex-start' as const,
  marginTop: 6,
  backgroundColor: '#F1F5F9',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 2,
};
