import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
}

export function ScreenContainer({
  children,
  scrollable = true,
  className = '',
}: ScreenContainerProps) {
  const content = (
    <View className={`flex-1 px-4 pt-4 ${className}`}>{children}</View>
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
