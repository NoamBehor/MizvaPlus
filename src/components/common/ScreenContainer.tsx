import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { useScrollBottomInset } from '@/hooks/useScrollBottomInset';

const WEB_PREVIEW_MAX_WIDTH = 480;

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
  /** Additional scroll padding for screen-local overlays (e.g. mini player). */
  extraScrollBottomInset?: number;
}

export function ScreenContainer({
  children,
  scrollable = true,
  className = '',
  extraScrollBottomInset = 0,
}: ScreenContainerProps) {
  const { scrollPaddingBottom, excludeBottomSafeArea } =
    useScrollBottomInset(extraScrollBottomInset);

  const frameStyle =
    Platform.OS === 'web'
      ? {
          flex: 1,
          width: '100%' as const,
          maxWidth: WEB_PREVIEW_MAX_WIDTH,
          alignSelf: 'center' as const,
        }
      : { flex: 1 };

  const content = (
    <View className={`flex-1 px-4 pt-4 ${className}`}>{children}</View>
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={
        excludeBottomSafeArea ? ['top', 'left', 'right'] : undefined
      }
      style={{ backgroundColor: colors.background }}
    >
      <View style={frameStyle}>
        {scrollable ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: scrollPaddingBottom,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </View>
    </SafeAreaView>
  );
}
