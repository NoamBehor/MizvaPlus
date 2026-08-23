import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { MitzvahCategory } from '@/types/mitzvah';

interface CategoryTabsProps {
  categories: MitzvahCategory[];
  labels: Record<MitzvahCategory, string>;
  activeCategory: MitzvahCategory;
  onCategoryChange: (category: MitzvahCategory) => void;
}

export function CategoryTabs({
  categories,
  labels,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <View
      className="mb-6 flex-row rounded-2xl p-1"
      style={{ backgroundColor: colors.border }}
      accessibilityRole="tablist"
    >
      {categories.map((category) => {
        const isActive = category === activeCategory;

        return (
          <Pressable
            key={category}
            onPress={() => onCategoryChange(category)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={labels[category]}
            className="flex-1 items-center rounded-xl py-3"
            style={{
              backgroundColor: isActive ? colors.surface : 'transparent',
              minHeight: 44,
            }}
          >
            <Text
              style={[
                typography.label,
                { color: isActive ? colors.primary : colors.muted },
              ]}
            >
              {labels[category]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
