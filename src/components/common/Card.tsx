import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, shadows, surfaces } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function Card({
  children,
  className = '',
  style,
  elevated = false,
  onLayout,
}: CardProps) {
  return (
    <View
      onLayout={onLayout}
      className={`p-4 ${className}`}
      style={[
        shadows.card,
        {
          backgroundColor: elevated ? surfaces.elevated : surfaces.card,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: elevated ? colors.border : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
