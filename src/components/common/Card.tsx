import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';
import { shadows } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface p-4 ${className}`}
      style={[shadows.card, { backgroundColor: colors.surface }, style]}
    >
      {children}
    </View>
  );
}
