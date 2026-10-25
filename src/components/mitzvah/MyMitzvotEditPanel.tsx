import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { MitzvahReminderTimeModal } from '@/components/mitzvah/MitzvahReminderTimeModal';
import { MitzvahSelectionCard } from '@/components/mitzvah/MitzvahSelectionCard';
import { colors } from '@/constants/colors';
import { rtlTextInputStyle } from '@/constants/layoutDirection';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { enableNotifications } from '@/services/notificationScheduler';
import { getAllMitzvot, getMitzvotByCategory } from '@/services/mitzvot';
import { useMitzvahStore } from '@/store/mitzvahStore';
import type { Mitzvah, MitzvahCategory, UserMitzvahPreference } from '@/types/mitzvah';

type DraftReminderState = {
  reminderEnabled: boolean;
  reminderTime: string;
};

function buildDraftReminders(
  catalog: Mitzvah[],
  preferences: Record<string, UserMitzvahPreference>,
): Record<string, DraftReminderState> {
  const result: Record<string, DraftReminderState> = {};

  for (const mitzvah of catalog) {
    if (mitzvah.category !== 'daily') {
      continue;
    }

    const preference = preferences[mitzvah.id];
    result[mitzvah.id] = {
      reminderEnabled: preference?.reminderEnabled ?? false,
      reminderTime: preference?.reminderTime ?? mitzvah.defaultTime ?? '07:30',
    };
  }

  return result;
}

function hasReminderDraftChanges(
  catalog: Mitzvah[],
  draftSelection: Set<string>,
  draftReminders: Record<string, DraftReminderState>,
  savedReminders: Record<string, DraftReminderState>,
): boolean {
  for (const mitzvah of catalog) {
    if (mitzvah.category !== 'daily' || !draftSelection.has(mitzvah.id)) {
      continue;
    }

    const draft = draftReminders[mitzvah.id];
    const saved = savedReminders[mitzvah.id];
    if (!draft || !saved) {
      continue;
    }

    if (draft.reminderEnabled !== saved.reminderEnabled) {
      return true;
    }

    if (draft.reminderEnabled && draft.reminderTime !== saved.reminderTime) {
      return true;
    }
  }

  return false;
}

const CATEGORIES: MitzvahCategory[] = ['daily', 'fast', 'holiday'];

const EDITOR_CATEGORY_LABELS: Record<MitzvahCategory, string> = {
  daily: 'תפילות ויומי',
  fast: 'צומות ותעניות',
  holiday: 'חגים ומועדים',
};

const SECTION_ACCENT: Record<MitzvahCategory, string> = {
  daily: colors.accent,
  fast: colors.slateMuted,
  holiday: colors.success,
};

type EditorFilter = 'all' | MitzvahCategory;

const FILTERS: { id: EditorFilter; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'daily', label: EDITOR_CATEGORY_LABELS.daily },
  { id: 'fast', label: EDITOR_CATEGORY_LABELS.fast },
  { id: 'holiday', label: EDITOR_CATEGORY_LABELS.holiday },
];

interface MyMitzvotEditPanelProps {
  userId: string;
  onClose: () => void;
}

export function MyMitzvotEditPanel({ userId, onClose }: MyMitzvotEditPanelProps) {
  const preferences = useMitzvahStore((state) => state.preferences);
  const saveTrackedSelections = useMitzvahStore(
    (state) => state.saveTrackedSelections,
  );
  const searchRef = useRef<TextInput>(null);

  const catalog = useMemo(() => getAllMitzvot(), []);

  const initialSelection = useMemo(() => {
    const enabled = new Set<string>();
    for (const [mitzvahId, preference] of Object.entries(preferences)) {
      if (preference?.enabled) {
        enabled.add(mitzvahId);
      }
    }
    return enabled;
  }, [preferences]);

  const initialDraftReminders = useMemo(
    () => buildDraftReminders(catalog, preferences),
    [catalog, preferences],
  );

  const [draftSelection, setDraftSelection] = useState<Set<string>>(
    () => new Set(initialSelection),
  );
  const [draftReminders, setDraftReminders] =
    useState<Record<string, DraftReminderState>>(initialDraftReminders);
  const [timePickerMitzvahId, setTimePickerMitzvahId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EditorFilter>('all');

  useEffect(() => {
    setDraftSelection(new Set(initialSelection));
    setDraftReminders(initialDraftReminders);
  }, [initialDraftReminders, initialSelection]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const hasChanges = useMemo(() => {
    if (draftSelection.size !== initialSelection.size) {
      return true;
    }

    for (const id of draftSelection) {
      if (!initialSelection.has(id)) {
        return true;
      }
    }

    for (const id of initialSelection) {
      if (!draftSelection.has(id)) {
        return true;
      }
    }

    return hasReminderDraftChanges(
      catalog,
      draftSelection,
      draftReminders,
      initialDraftReminders,
    );
  }, [
    catalog,
    draftReminders,
    draftSelection,
    initialDraftReminders,
    initialSelection,
  ]);

  const query = searchQuery.trim();
  const searchActive = query.length > 0;
  const selectedCount = catalog.filter((mitzvah) =>
    draftSelection.has(mitzvah.id),
  ).length;
  const allSelected = selectedCount === catalog.length && catalog.length > 0;

  const visibleSections = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      mitzvot: getMitzvotByCategory(category).filter((mitzvah) => {
        if (activeFilter !== 'all' && mitzvah.category !== activeFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          mitzvah.title.includes(query) || mitzvah.description.includes(query)
        );
      }),
    })).filter((section) => section.mitzvot.length > 0);
  }, [activeFilter, query]);

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

  const toggleAll = useCallback(() => {
    if (searchActive) {
      return;
    }

    setDraftSelection(
      allSelected ? new Set() : new Set(catalog.map((mitzvah) => mitzvah.id)),
    );
    setFeedback(null);
  }, [allSelected, catalog, searchActive]);

  const handleReset = useCallback(() => {
    if (!hasChanges || isSaving) {
      return;
    }

    setDraftSelection(new Set(initialSelection));
    setDraftReminders(initialDraftReminders);
    setFeedback('השינויים שלא נשמרו בוטלו');
  }, [hasChanges, initialDraftReminders, initialSelection, isSaving]);

  const handleReminderToggle = useCallback(
    async (mitzvah: Mitzvah, enabled: boolean) => {
      if (enabled) {
        const permission = await enableNotifications();
        if (!permission.granted) {
          setFeedback(
            'לא ניתן להפעיל תזכורות ללא אישור התראות. יש לאפשר התראות בהגדרות המכשיר.',
          );
          return;
        }
      }

      setDraftReminders((prev) => {
        const current = prev[mitzvah.id] ?? {
          reminderEnabled: false,
          reminderTime: mitzvah.defaultTime ?? '07:30',
        };

        return {
          ...prev,
          [mitzvah.id]: {
            reminderEnabled: enabled,
            reminderTime: current.reminderTime,
          },
        };
      });
      setFeedback(null);
    },
    [],
  );

  const handleConfirmReminderTime = useCallback((time: string) => {
    if (!timePickerMitzvahId) {
      return;
    }

    setDraftReminders((prev) => {
      const current = prev[timePickerMitzvahId];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        [timePickerMitzvahId]: {
          ...current,
          reminderTime: time,
        },
      };
    });
    setTimePickerMitzvahId(null);
    setFeedback('שעת התזכורת עודכנה בהצלחה');
  }, [timePickerMitzvahId]);

  const handleSave = useCallback(async () => {
    if (isSaving || !hasChanges) {
      return;
    }

    const needsReminderPermission = catalog.some(
      (mitzvah) =>
        mitzvah.category === 'daily' &&
        draftSelection.has(mitzvah.id) &&
        draftReminders[mitzvah.id]?.reminderEnabled,
    );

    if (needsReminderPermission) {
      const permission = await enableNotifications();
      if (!permission.granted) {
        setFeedback(
          'לא ניתן לשמור תזכורות ללא אישור התראות. יש לאפשר התראות בהגדרות המכשיר.',
        );
        return;
      }
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await saveTrackedSelections(
        userId,
        [...draftSelection],
        draftReminders,
      );
      setFeedback(
        result === 'saved' ? 'המצוות שלך עודכנו' : 'לא בוצעו שינויים',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    catalog,
    draftReminders,
    draftSelection,
    hasChanges,
    isSaving,
    saveTrackedSelections,
    userId,
  ]);

  const timePickerMitzvah = timePickerMitzvahId
    ? catalog.find((mitzvah) => mitzvah.id === timePickerMitzvahId)
    : undefined;

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            testID="my-mitzvot-back"
            style={styles.backButton}
          >
            <AppIcon name="chevronRight" size={16} color={colors.accent} />
            <Text style={[typography.label, styles.backLabel]}>חזרה</Text>
          </Pressable>

          <View style={styles.badge} accessibilityRole="text">
            <View style={styles.badgeDot} />
            <Text style={[typography.caption, styles.badgeText]} numberOfLines={1}>
              {`${selectedCount} מתוך ${catalog.length} נבחרו`}
            </Text>
          </View>

          <Pressable
            onPress={toggleAll}
            disabled={searchActive}
            accessibilityRole="button"
            accessibilityState={{ disabled: searchActive }}
            accessibilityLabel={allSelected ? 'בטל הכל' : 'בחר הכל'}
            testID="my-mitzvot-select-all"
            hitSlop={8}
            style={[styles.selectAll, searchActive ? styles.selectAllDisabled : null]}
          >
            <Text style={[typography.caption, styles.selectAllText]}>
              {allSelected ? 'בטל הכל' : 'בחר הכל'}
            </Text>
          </Pressable>
        </View>

        <Text style={typography.title}>עריכת המצוות שלי</Text>
        <Text style={[typography.caption, styles.subtitle]}>
          התאם אישית את התפילות, הצומות והחגים למעקב יומיומי ושנתי
        </Text>

        <View style={styles.searchWrap}>
          <View style={styles.searchIcon} pointerEvents="none">
            <AppIcon name="magnify" size={18} color={colors.muted} />
          </View>
          <TextInput
            ref={searchRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="חיפוש מצווה, תפילה או חג..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, rtlTextInputStyle]}
            accessibilityLabel="חיפוש מצווה, תפילה או חג"
            testID="my-mitzvot-search"
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={clearSearch}
              accessibilityRole="button"
              accessibilityLabel="נקה חיפוש"
              testID="my-mitzvot-clear-search"
              hitSlop={8}
              style={styles.clearSearch}
            >
              <AppIcon name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pills}
          accessibilityLabel="סינון קטגוריות"
        >
          {FILTERS.map((filter) => {
            const selected = filter.id === activeFilter;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={filter.label}
                testID={`my-mitzvot-filter-${filter.id}`}
                style={[styles.pill, selected ? styles.pillActive : styles.pillIdle]}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected ? styles.pillTextActive : styles.pillTextIdle,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {visibleSections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={typography.subtitle}>לא נמצאו תוצאות</Text>
            <Text style={[typography.caption, styles.emptyHint]}>
              נסה לחפש מושג אחר או לנקות את שורת החיפוש
            </Text>
          </View>
        ) : (
          visibleSections.map((section) => {
            const sectionSelected = getMitzvotByCategory(section.category).filter(
              (mitzvah) => draftSelection.has(mitzvah.id),
            ).length;

            return (
              <View key={section.category} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View
                      style={[
                        styles.sectionBar,
                        { backgroundColor: SECTION_ACCENT[section.category] },
                      ]}
                    />
                    <Text style={typography.label}>
                      {EDITOR_CATEGORY_LABELS[section.category]}
                    </Text>
                  </View>
                  <Text style={typography.caption}>{`${sectionSelected} נבחרו`}</Text>
                </View>
                {section.mitzvot.map((mitzvah) => {
                  const reminder = draftReminders[mitzvah.id];
                  const isSelected = draftSelection.has(mitzvah.id);

                  return (
                    <MitzvahSelectionCard
                      key={mitzvah.id}
                      mitzvah={mitzvah}
                      selected={isSelected}
                      onPress={() => toggleDraft(mitzvah.id)}
                      reminderEnabled={reminder?.reminderEnabled ?? false}
                      reminderTime={
                        reminder?.reminderTime ??
                        mitzvah.defaultTime ??
                        '07:30'
                      }
                      onReminderToggle={
                        isSelected && mitzvah.category === 'daily'
                          ? (enabled) => void handleReminderToggle(mitzvah, enabled)
                          : undefined
                      }
                      onEditReminderTime={
                        isSelected &&
                        mitzvah.category === 'daily' &&
                        reminder?.reminderEnabled
                          ? () => setTimePickerMitzvahId(mitzvah.id)
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        {feedback ? (
          <Text
            style={[typography.caption, styles.feedback]}
            accessibilityLiveRegion="polite"
            testID="my-mitzvot-feedback"
          >
            {feedback}
          </Text>
        ) : null}
        <View style={styles.footerActions}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            accessibilityRole="button"
            accessibilityLabel="שמירת שינויים"
            accessibilityState={{ disabled: isSaving || !hasChanges }}
            testID="my-mitzvot-save"
            style={[
              styles.saveButton,
              isSaving || !hasChanges ? styles.saveDisabled : null,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <AppIcon name="check" size={18} color={colors.gold} />
                <Text style={[typography.subtitle, styles.saveLabel]}>
                  שמירת שינויים
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleReset}
            disabled={isSaving || !hasChanges}
            accessibilityRole="button"
            accessibilityLabel="איפוס"
            accessibilityState={{ disabled: isSaving || !hasChanges }}
            testID="my-mitzvot-reset"
            style={[
              styles.resetButton,
              isSaving || !hasChanges ? styles.resetDisabled : null,
            ]}
          >
            <Text style={[typography.label, styles.resetLabel]}>איפוס</Text>
          </Pressable>
        </View>
      </View>

      <MitzvahReminderTimeModal
        visible={timePickerMitzvahId !== null}
        title={
          timePickerMitzvah
            ? `שעת תזכורת — ${timePickerMitzvah.title}`
            : 'שעת תזכורת'
        }
        value={
          timePickerMitzvahId
            ? (draftReminders[timePickerMitzvahId]?.reminderTime ?? '07:30')
            : '07:30'
        }
        onConfirm={handleConfirmReminderTime}
        onCancel={() => setTimePickerMitzvahId(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    direction: 'rtl',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EADFCB',
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#E2D8C3',
    backgroundColor: colors.surface,
  },
  backLabel: {
    fontSize: 13,
  },
  badge: {
    flexShrink: 1,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: '#FFF7ED',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.goldDeep,
  },
  badgeText: {
    flexShrink: 1,
    fontWeight: '600',
    color: colors.text,
  },
  selectAll: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  selectAllDisabled: {
    opacity: 0.4,
  },
  selectAllText: {
    textDecorationLine: 'underline',
    color: colors.slateMuted,
  },
  subtitle: {
    marginTop: -4,
    lineHeight: 18,
  },
  searchWrap: {
    minHeight: 44,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  searchInput: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5DAC4',
    backgroundColor: colors.surface,
    paddingRight: 40,
    paddingLeft: 44,
    fontSize: 14,
    color: colors.text,
  },
  clearSearch: {
    position: 'absolute',
    left: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillScroll: {
    flexGrow: 0,
    direction: 'ltr',
  },
  pills: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E0D5BE',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.white,
  },
  pillTextIdle: {
    color: colors.slateMuted,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionBar: {
    width: 6,
    height: 16,
    borderRadius: borderRadius.full,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyHint: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5DCBE',
    backgroundColor: colors.background,
    ...shadows.card,
    shadowOffset: { width: 0, height: -4 },
  },
  feedback: {
    textAlign: 'center',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveDisabled: {
    opacity: 0.65,
  },
  saveLabel: {
    fontSize: 16,
    color: colors.white,
  },
  resetButton: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#D9CEB4',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetDisabled: {
    opacity: 0.65,
  },
  resetLabel: {
    color: colors.slate,
  },
});
