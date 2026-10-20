import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { CATEGORY_LABELS } from '@/constants/mitzvot';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getMitzvotByCategory } from '@/services/mitzvot';
import { useMitzvahStore } from '@/store/mitzvahStore';
import type { MitzvahCategory } from '@/types/mitzvah';
import { getMitzvahIcon } from '@/utils/mitzvah';

const CATEGORIES: MitzvahCategory[] = ['daily', 'fast', 'holiday'];

interface MyMitzvotEditPanelProps {
  userId: string;
  onClose: () => void;
}

export function MyMitzvotEditPanel({ userId, onClose }: MyMitzvotEditPanelProps) {
  const preferences = useMitzvahStore((state) => state.preferences);
  const saveTrackedSelections = useMitzvahStore(
    (state) => state.saveTrackedSelections,
  );

  const initialSelection = useMemo(() => {
    const enabled = new Set<string>();
    for (const [mitzvahId, preference] of Object.entries(preferences)) {
      if (preference?.enabled) {
        enabled.add(mitzvahId);
      }
    }
    return enabled;
  }, [preferences]);

  const [draftSelection, setDraftSelection] = useState<Set<string>>(
    () => new Set(initialSelection),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraftSelection(new Set(initialSelection));
  }, [initialSelection]);

  const hasChanges = useMemo(() => {
    if (draftSelection.size !== initialSelection.size) {
      return true;
    }

    for (const id of draftSelection) {
      if (!initialSelection.has(id)) {
        return true;
      }
    }

    return false;
  }, [draftSelection, initialSelection]);

  const toggleDraft = useCallback((mitzvahId: string) => {
    setDraftSelection((prev) => {
      const next = new Set(prev);
      if (next.has(mitzvahId)) {
        next.delete(mitzvahId);
      } else {
        next.add(mitzvahId);
      }
      return next;
    });
    setFeedback(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await saveTrackedSelections(userId, [...draftSelection]);
      if (result === 'saved') {
        setFeedback('המצוות שלך עודכנו');
        onClose();
      } else {
        setFeedback('לא בוצעו שינויים');
      }
    } finally {
      setIsSaving(false);
    }
  }, [draftSelection, isSaving, onClose, saveTrackedSelections, userId]);

  return (
    <View className="mb-6">
      <View
        className="mb-4 flex-row-reverse items-center justify-between"
        style={{ gap: spacing.sm }}
      >
        <Text style={typography.subtitle}>עריכת המצוות שלי</Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="סגור עריכה"
          hitSlop={8}
        >
          <Text style={[typography.label, { color: colors.secondary }]}>סגור</Text>
        </Pressable>
      </View>

      {CATEGORIES.map((category) => {
        const mitzvot = getMitzvotByCategory(category);

        return (
          <View key={`edit-${category}`} className="mb-5">
            <Text style={[typography.label, { marginBottom: spacing.sm }]}>
              {CATEGORY_LABELS[category]}
            </Text>

            {mitzvot.map((mitzvah) => {
              const selected = draftSelection.has(mitzvah.id);
              const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);

              return (
                <Pressable
                  key={mitzvah.id}
                  onPress={() => toggleDraft(mitzvah.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${selected ? 'נבחר' : 'לא נבחר'} ${mitzvah.title}`}
                  className="mb-2"
                >
                  <Card
                    style={{
                      borderColor: selected ? colors.accent : colors.border,
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? '#FBF7EC' : colors.surface,
                      paddingVertical: spacing.md,
                    }}
                  >
                    <View className="flex-row-reverse items-center justify-between">
                      <View className="flex-1 items-end">
                        <Text style={typography.subtitle}>{mitzvah.title}</Text>
                        <Text style={[typography.bodySmall, { marginTop: 4 }]}>
                          {mitzvah.description}
                        </Text>
                      </View>
                      <View
                        style={{
                          marginLeft: spacing.md,
                          width: 36,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{icon}</Text>
                        <Text
                          style={[
                            typography.label,
                            {
                              marginTop: 4,
                              color: selected ? colors.success : colors.muted,
                            },
                          ]}
                        >
                          {selected ? '✓' : '○'}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <Pressable
        onPress={() => void handleSave()}
        disabled={isSaving || !hasChanges}
        accessibilityRole="button"
        accessibilityLabel="שמירה"
        className="items-center rounded-2xl py-4"
        style={{
          backgroundColor: colors.primary,
          minHeight: 52,
          opacity: isSaving || !hasChanges ? 0.65 : 1,
          borderRadius: borderRadius.lg,
        }}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={[typography.subtitle, { color: colors.white }]}>שמירה</Text>
        )}
      </Pressable>

      {feedback ? (
        <Text
          style={[
            typography.bodySmall,
            {
              marginTop: spacing.sm,
              textAlign: 'center',
              color: colors.success,
            },
          ]}
        >
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}
