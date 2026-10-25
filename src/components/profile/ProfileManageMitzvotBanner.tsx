import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { profileTheme } from '@/constants/profileTheme';
import { spacing } from '@/constants/theme';
import { navigateToMyMitzvot } from '@/navigation/navigationRef';

const AMBER_BORDER = '#FCD34D';
const AMBER_RING = 'rgba(253, 230, 138, 0.65)';
const EDIT_TEXT = '#92400E';
const SPARKLE = '#F59E0B';
const SUBTITLE = '#475569';

export function ProfileManageMitzvotBanner() {
  const fontsLoaded = useHomeFonts();

  const handlePress = () => {
    navigateToMyMitzvot({ openEdit: true });
  };

  return (
    <View style={outerRing} testID="profile-manage-mitzvot-banner">
      <LinearGradient
        colors={['rgba(255, 251, 235, 0.72)', '#FFFFFF', 'rgba(255, 251, 235, 0.48)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={bannerShell}
      >
        <View style={bannerInner}>
          <View style={leadingBlock}>
            <LinearGradient
              colors={['#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={iconBox}
            >
              <AppIcon name="clipboardCheck" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={textBlock}>
              <View style={titleRow}>
                <Text
                  style={[
                    homeFontStyle(fontsLoaded, homeFonts.bold),
                    titleText,
                  ]}
                >
                  ניהול המצוות שלי
                </Text>
                <Text style={sparkle}>✨</Text>
              </View>
              <Text style={subtitle}>
                בחירה והתאמה אישית של המצוות וההרגלים היומיים שלך
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="עריכת מצוות"
            style={({ pressed }) => [
              editChip,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <AppIcon name="pencil" size={14} color={EDIT_TEXT} />
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: EDIT_TEXT, fontSize: 12 },
              ]}
            >
              עריכה
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const outerRing = {
  borderRadius: 16,
  borderWidth: 2,
  borderColor: AMBER_RING,
  marginBottom: 0,
  shadowColor: '#D99B00',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 4,
};

const bannerShell = {
  borderRadius: 14,
  borderWidth: 2,
  borderColor: AMBER_BORDER,
  overflow: 'hidden' as const,
};

const bannerInner = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: spacing.sm,
  padding: spacing.md,
  direction: 'rtl' as const,
};

const leadingBlock = {
  flex: 1,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: spacing.sm,
  direction: 'rtl' as const,
};

const textBlock = {
  flex: 1,
  direction: 'rtl' as const,
};

const titleRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'flex-start' as const,
  gap: 6,
  direction: 'rtl' as const,
};

const titleText = {
  color: homeTheme.text,
  fontSize: 14,
  lineHeight: 18,
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

const sparkle = {
  color: SPARKLE,
  fontSize: 12,
  lineHeight: 16,
};

const subtitle = {
  marginTop: 4,
  fontSize: 12,
  lineHeight: 18,
  color: SUBTITLE,
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

const iconBox = {
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '#B45309',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 2,
};

const editChip = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: AMBER_BORDER,
  backgroundColor: 'rgba(254, 243, 199, 0.82)',
  minHeight: 44,
  flexShrink: 0,
  direction: 'rtl' as const,
};
