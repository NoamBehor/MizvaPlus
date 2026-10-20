import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { PrayerReaderAudioControls } from '@/components/prayer/PrayerReaderAudioControls';
import { colors } from '@/constants/colors';
import { SHACHARIT_TOC_CATEGORIES } from '@/constants/shacharitStructure';
import {
  isMajorPrayerSurfaceSection,
  prayerRtlBlock,
  prayerRtlContainer,
  prayerRtlText,
} from '@/constants/prayerReaderLayout';
import { borderRadius, spacing, surfaces, typography } from '@/constants/theme';
import { stopSpeaking } from '@/services/audio';
import { useHebrewCalendar } from '@/hooks/useHebrewCalendar';
import type { RootStackParamList } from '@/navigation/types';
import {
  enrichPrayerSections,
  getPrayer,
  listAvailableNusachimWithStatus,
} from '@/services/texts/prayerContentService';
import {
  getOrderedRitualSections,
  getRitualGuide,
  listAvailableRitualGuideNusachimWithStatus,
} from '@/services/texts/ritualContentService';
import {
  getNextLargerFontSize,
  getNextSmallerFontSize,
  getPrayerFontSize,
  getPrayerReadingPosition,
  savePrayerReadingPosition,
  setPrayerFontSize,
} from '@/services/texts/prayerReaderPreferences';
import {
  DEFAULT_PRAYER_FONT_SIZE,
  NUSACH_LABELS,
  type EnrichedPrayerSection,
  type PrayerFontSize,
} from '@/types/prayer';
import type { RitualGuideSection, RitualGuideSectionKind } from '@/types/ritualGuide';

type PrayerReaderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'PrayerReader'
>;

const RITUAL_ACTION_COLOR = '#5C4A32';
const RITUAL_BLESSING_COLOR = colors.text;
const RITUAL_INSTRUCTION_COLOR = colors.accent;
const SECTION_CHIP_MAX_WIDTH = Dimensions.get('window').width * 0.72;

export function PrayerReaderScreen({
  navigation,
  route,
}: PrayerReaderScreenProps) {
  const { prayerId, ritualGuideId, nusach } = route.params;
  const { dayInfo } = useHebrewCalendar();
  const prayer = prayerId ? getPrayer(prayerId, nusach) : null;
  const ritualGuide = ritualGuideId ? getRitualGuide(ritualGuideId, nusach) : null;
  const readerTitle = prayer?.title ?? ritualGuide?.title ?? 'תפילה';
  const isRitualGuide = ritualGuide !== null;
  const prayerSections = useMemo(
    () => (prayer ? enrichPrayerSections(prayer, dayInfo) : []),
    [prayer, dayInfo],
  );
  const ritualSections = useMemo(
    () => (ritualGuide ? getOrderedRitualSections(ritualGuide) : []),
    [ritualGuide],
  );
  const ritualStepNumbers = useMemo(() => {
    const numbers: Record<string, number> = {};
    let stepCounter = 0;

    for (const section of ritualSections) {
      if (section.kind === 'step' || section.kind === 'action') {
        stepCounter += 1;
        numbers[section.id] = stepCounter;
      }
    }

    return numbers;
  }, [ritualSections]);
  const sections = isRitualGuide ? ritualSections : prayerSections;
  const audioContent = useMemo(() => {
    if (isRitualGuide) {
      return ritualSections
        .flatMap((section) => [
          section.instruction ?? '',
          ...section.text,
        ])
        .filter((paragraph) => paragraph.trim().length > 0)
        .join('\n\n');
    }

    return prayerSections
      .flatMap((section) => section.text)
      .join('\n\n');
  }, [isRitualGuide, prayerSections, ritualSections]);
  const tocCategories =
    prayerId === 'shacharit' ? SHACHARIT_TOC_CATEGORIES : null;

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const pendingResumeYRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fontSize, setFontSize] = useState<PrayerFontSize>(
    DEFAULT_PRAYER_FONT_SIZE,
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [resumeOffer, setResumeOffer] = useState<number | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [storedFontSize, storedPosition] = await Promise.all([
        getPrayerFontSize(),
        getPrayerReadingPosition(),
      ]);

      if (cancelled) {
        return;
      }

      setFontSize(storedFontSize);

      const matchesContent =
        storedPosition &&
        storedPosition.nusach === nusach &&
        ((prayerId && storedPosition.prayerId === prayerId) ||
          (ritualGuideId && storedPosition.ritualGuideId === ritualGuideId));

      if (matchesContent && storedPosition.scrollY > 48) {
        setResumeOffer(storedPosition.scrollY);
      }

      setPreferencesLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [prayerId, ritualGuideId, nusach]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopSpeaking();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, []),
  );

  const persistScrollPosition = useCallback(
    (scrollY: number) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void savePrayerReadingPosition({
          prayerId,
          ritualGuideId,
          nusach,
          scrollY,
        });
      }, 350);
    },
    [prayerId, ritualGuideId, nusach],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      persistScrollPosition(scrollY);

      const entries = Object.entries(sectionOffsetsRef.current).sort(
        (left, right) => left[1] - right[1],
      );

      let currentSectionId: string | null = null;
      for (const [sectionId, offsetY] of entries) {
        if (scrollY + 120 >= offsetY) {
          currentSectionId = sectionId;
        }
      }

      setActiveSectionId(currentSectionId);
    },
    [persistScrollPosition],
  );

  const handleSectionLayout = useCallback((sectionId: string, y: number) => {
    sectionOffsetsRef.current[sectionId] = y;
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const offsetY = sectionOffsetsRef.current[sectionId] ?? 0;
    scrollRef.current?.scrollTo({ y: offsetY, animated: true });
    setActiveSectionId(sectionId);
    setResumeOffer(null);
  }, []);

  const handleResumeReading = useCallback(() => {
    if (resumeOffer == null) {
      return;
    }

    pendingResumeYRef.current = resumeOffer;
    scrollRef.current?.scrollTo({ y: resumeOffer, animated: true });
    setResumeOffer(null);
  }, [resumeOffer]);

  const handleDismissResume = useCallback(() => {
    setResumeOffer(null);
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize((current) => {
      const next = getNextSmallerFontSize(current);
      if (!next) {
        return current;
      }

      void setPrayerFontSize(next);
      return next;
    });
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize((current) => {
      const next = getNextLargerFontSize(current);
      if (!next) {
        return current;
      }

      void setPrayerFontSize(next);
      return next;
    });
  }, []);

  const nusachStatus = useMemo(() => {
    if (ritualGuideId) {
      return listAvailableRitualGuideNusachimWithStatus(ritualGuideId);
    }

    if (prayerId) {
      return listAvailableNusachimWithStatus(prayerId);
    }

    return [];
  }, [prayerId, ritualGuideId]);

  if (!prayer && !ritualGuide) {
    return (
      <View
        className="flex-1 px-4 pt-4"
        style={{ backgroundColor: surfaces.prayerReaderBackground }}
      >
        <ReaderHeader
          title="תפילה"
          nusachLabel=""
          fontSize={fontSize}
          onBack={() => navigation.goBack()}
          onDecreaseFontSize={decreaseFontSize}
          onIncreaseFontSize={increaseFontSize}
          canDecrease={false}
          canIncrease={false}
        />
        <View className="mt-8" style={prayerRtlContainer}>
          <Text style={[typography.body, prayerRtlBlock]}>
            התוכן המקומי לתפילה זו אינו זמין עדיין.
          </Text>
        </View>
      </View>
    );
  }

  const lineHeight = Math.round(fontSize * 1.75);
  const paragraphSpacing = Math.round(fontSize * 0.9);
  const sectionSpacing = Math.round(fontSize * 1.6);
  const readerBottomInset = spacing.xxl + 72;
  const canDecrease = getNextSmallerFontSize(fontSize) !== null;
  const canIncrease = getNextLargerFontSize(fontSize) !== null;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: surfaces.prayerReaderBackground }}
    >
      <View className="px-4 pt-4" style={prayerRtlContainer}>
        <ReaderHeader
          title={readerTitle}
          nusachLabel={`נוסח ${NUSACH_LABELS[nusach]}`}
          fontSize={fontSize}
          onBack={() => navigation.goBack()}
          onDecreaseFontSize={decreaseFontSize}
          onIncreaseFontSize={increaseFontSize}
          canDecrease={canDecrease}
          canIncrease={canIncrease}
        />

        <NusachAvailabilityRow items={nusachStatus} currentNusach={nusach} />

        {sections.length > 1 ? (
          <SectionNavigator
            sections={sections.map((section) => ({
              id: section.id,
              title: section.title,
              isConditional:
                !isRitualGuide &&
                'availability' in section &&
                section.availability !== 'always',
            }))}
            activeSectionId={activeSectionId}
            onSelectSection={scrollToSection}
            onOpenTableOfContents={
              tocCategories ? () => setTocVisible(true) : undefined
            }
          />
        ) : null}

        {preferencesLoaded && resumeOffer != null ? (
          <ResumeBanner
            onResume={handleResumeReading}
            onDismiss={handleDismissResume}
          />
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          ...prayerRtlContainer,
          paddingHorizontal: spacing.lg,
          paddingBottom: readerBottomInset,
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (pendingResumeYRef.current != null) {
            scrollRef.current?.scrollTo({
              y: pendingResumeYRef.current,
              animated: false,
            });
            pendingResumeYRef.current = null;
          }
        }}
      >
        {isRitualGuide
          ? ritualSections.map((section, index) => (
              <RitualGuideSectionBlock
                key={section.id}
                section={section}
                stepNumber={ritualStepNumbers[section.id] ?? null}
                isLast={index === ritualSections.length - 1}
                fontSize={fontSize}
                lineHeight={lineHeight}
                paragraphSpacing={paragraphSpacing}
                sectionSpacing={sectionSpacing}
                onLayout={(y) => handleSectionLayout(section.id, y)}
              />
            ))
          : prayerSections.map((section, index) => (
              <PrayerSectionBlock
                key={section.id}
                section={section}
                isLast={index === prayerSections.length - 1}
                fontSize={fontSize}
                lineHeight={lineHeight}
                paragraphSpacing={paragraphSpacing}
                sectionSpacing={sectionSpacing}
                onLayout={(y) => handleSectionLayout(section.id, y)}
              />
            ))}
      </ScrollView>

      <PrayerReaderAudioControls content={audioContent} />

      {tocCategories ? (
        <SectionTableOfContents
          visible={tocVisible}
          categories={tocCategories}
          sections={prayerSections}
          activeSectionId={activeSectionId}
          onClose={() => setTocVisible(false)}
          onSelectSection={(sectionId) => {
            setTocVisible(false);
            scrollToSection(sectionId);
          }}
        />
      ) : null}
    </View>
  );
}

interface ReaderHeaderProps {
  title: string;
  nusachLabel: string;
  fontSize: PrayerFontSize;
  onBack: () => void;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
}

function ReaderHeader({
  title,
  nusachLabel,
  fontSize,
  onBack,
  onDecreaseFontSize,
  onIncreaseFontSize,
  canDecrease,
  canIncrease,
}: ReaderHeaderProps) {
  return (
    <View className="mb-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <FontControlButton
            label="A-"
            accessibilityLabel="הקטן גופן"
            onPress={onDecreaseFontSize}
            disabled={!canDecrease}
          />
          <Text style={[typography.caption, { minWidth: 28, textAlign: 'center' }]}>
            {fontSize}
          </Text>
          <FontControlButton
            label="A+"
            accessibilityLabel="הגדל גופן"
            onPress={onIncreaseFontSize}
            disabled={!canIncrease}
          />
        </View>

        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={typography.label}>← חזרה</Text>
        </Pressable>
      </View>

      <View style={prayerRtlContainer}>
        <Text
          style={[
            typography.title,
            prayerRtlBlock,
            {
              fontSize: 28,
              lineHeight: 36,
              color: colors.text,
            },
          ]}
        >
          {title}
        </Text>
        {nusachLabel ? (
          <Text
            style={[
              typography.bodySmall,
              prayerRtlBlock,
              { marginTop: 6, color: colors.secondary },
            ]}
          >
            {nusachLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface FontControlButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

function FontControlButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: FontControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="rounded-full px-3 py-2"
      style={{
        backgroundColor: surfaces.prayerSectionChip,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={[typography.label, { fontSize: 16 }]}>{label}</Text>
    </Pressable>
  );
}

interface NusachAvailabilityRowProps {
  items: ReturnType<typeof listAvailableNusachimWithStatus>;
  currentNusach: RootStackParamList['PrayerReader']['nusach'];
}

function NusachAvailabilityRow({
  items,
  currentNusach,
}: NusachAvailabilityRowProps) {
  return (
    <View className="mb-4" style={prayerRtlContainer}>
      {items.map(({ nusach, available }) => {
        const isCurrent = nusach === currentNusach;
        const label = available
          ? `${NUSACH_LABELS[nusach]}${isCurrent ? ' ✓' : ''}`
          : `${NUSACH_LABELS[nusach]} — בקרוב`;

        return (
          <Text
            key={nusach}
            style={[
              typography.caption,
              prayerRtlBlock,
              {
                color: available ? colors.text : colors.muted,
                marginBottom: 4,
              },
            ]}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
}

interface SectionNavigatorProps {
  sections: Array<{ id: string; title: string; isConditional?: boolean }>;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onOpenTableOfContents?: () => void;
}

function SectionNavigator({
  sections,
  activeSectionId,
  onSelectSection,
  onOpenTableOfContents,
}: SectionNavigatorProps) {
  return (
    <View className="mb-3">
      {onOpenTableOfContents ? (
        <View className="mb-2 flex-row-reverse items-center justify-between">
          <Pressable
            onPress={onOpenTableOfContents}
            accessibilityRole="button"
            accessibilityLabel="קפיצה לסעיף"
            className="rounded-full px-4 py-2"
            style={{
              backgroundColor: surfaces.prayerSectionChip,
              minHeight: 36,
              justifyContent: 'center',
            }}
          >
            <Text style={[typography.label, prayerRtlText]}>קפיצה לסעיף</Text>
          </Pressable>
          <Text
            style={[
              typography.caption,
              prayerRtlText,
              { color: colors.secondary, flexShrink: 1 },
            ]}
          >
            ניווט לפי מבנה הסידור
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row-reverse',
          gap: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <Pressable
              key={section.id}
              onPress={() => onSelectSection(section.id)}
              accessibilityRole="button"
              accessibilityLabel={`עבור ל${section.title}`}
              className="rounded-full px-4 py-2"
              style={{
                backgroundColor: isActive ? colors.primary : surfaces.prayerSectionChip,
                borderWidth: section.isConditional && !isActive ? 1 : 0,
                borderColor: surfaces.prayerSectionConditionalBorder,
                minHeight: 40,
                justifyContent: 'center',
                flexShrink: 1,
                maxWidth: SECTION_CHIP_MAX_WIDTH,
              }}
            >
              <Text
                style={[
                  typography.label,
                  prayerRtlText,
                  {
                    color: isActive ? colors.white : colors.text,
                    flexShrink: 1,
                  },
                ]}
              >
                {section.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface SectionTableOfContentsProps {
  visible: boolean;
  categories: typeof SHACHARIT_TOC_CATEGORIES;
  sections: EnrichedPrayerSection[];
  activeSectionId: string | null;
  onClose: () => void;
  onSelectSection: (sectionId: string) => void;
}

function SectionTableOfContents({
  visible,
  categories,
  sections,
  activeSectionId,
  onClose,
  onSelectSection,
}: SectionTableOfContentsProps) {
  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-3xl px-4 pb-8 pt-4"
          style={{
            backgroundColor: surfaces.prayerReaderBackground,
            maxHeight: '78%',
          }}
        >
          <View className="mb-4 flex-row-reverse items-center justify-between">
            <Text style={typography.subtitle}>תוכן העניינים</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: surfaces.prayerSectionChip }}
            >
              <Text style={typography.label}>סגור</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator>
            {categories.map((category) => (
              <View key={category.id} className="mb-5">
                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.secondary,
                      marginBottom: spacing.sm,
                      textAlign: 'right',
                    },
                  ]}
                >
                  {category.title}
                </Text>

                {category.sectionIds.map((sectionId) => {
                  const section = sectionById.get(sectionId);
                  if (!section) {
                    return null;
                  }

                  const isActive = section.id === activeSectionId;

                  return (
                    <Pressable
                      key={section.id}
                      onPress={() => onSelectSection(section.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`עבור ל${section.title}`}
                      className="mb-2 rounded-2xl px-4 py-3"
                      style={{
                        backgroundColor: isActive
                          ? colors.primary
                          : surfaces.prayerSectionChip,
                        borderWidth:
                          section.availability !== 'always' && !isActive ? 1 : 0,
                        borderColor: surfaces.prayerSectionConditionalBorder,
                      }}
                    >
                      <Text
                        style={[
                          typography.body,
                          {
                            color: isActive ? colors.white : colors.text,
                            textAlign: 'right',
                          },
                        ]}
                      >
                        {section.title}
                      </Text>
                      {section.availabilityNote ? (
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: isActive ? colors.white : colors.secondary,
                              marginTop: 4,
                              textAlign: 'right',
                            },
                          ]}
                        >
                          {section.availabilityNote}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ResumeBannerProps {
  onResume: () => void;
  onDismiss: () => void;
}

function ResumeBanner({ onResume, onDismiss }: ResumeBannerProps) {
  return (
    <View
      className="mb-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: surfaces.prayerSectionChip,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={[typography.bodySmall, prayerRtlBlock, { marginBottom: spacing.sm }]}
      >
        המשך מהמקום האחרון
      </Text>
      <View className="flex-row-reverse gap-3">
        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="המשך מהמקום האחרון"
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: colors.primary, minHeight: 40 }}
        >
          <Text style={[typography.label, { color: colors.white }]}>המשך</Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="התחל מההתחלה"
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: colors.border, minHeight: 40 }}
        >
          <Text style={typography.label}>מההתחלה</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface PrayerSectionBlockProps {
  section: EnrichedPrayerSection;
  isLast: boolean;
  fontSize: PrayerFontSize;
  lineHeight: number;
  paragraphSpacing: number;
  sectionSpacing: number;
  onLayout: (y: number) => void;
}

function PrayerSectionBlock({
  section,
  isLast,
  fontSize,
  lineHeight,
  paragraphSpacing,
  sectionSpacing,
  onLayout,
}: PrayerSectionBlockProps) {
  const isConditional = section.availability !== 'always';
  const showConditionalState = isConditional && !section.applicableToday;
  const isMajorSection = isMajorPrayerSurfaceSection(section.id);
  const showMajorSurface = isMajorSection && !showConditionalState;

  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout.y)}
      style={{
        ...prayerRtlContainer,
        marginBottom: isLast ? 0 : sectionSpacing,
        marginTop: showMajorSurface ? spacing.sm : 0,
        paddingTop: showMajorSurface ? spacing.md : spacing.sm,
        paddingBottom: showMajorSurface
          ? spacing.md
          : isConditional
            ? spacing.md
            : spacing.sm,
        paddingHorizontal: showMajorSurface
          ? spacing.md
          : isConditional
            ? spacing.sm
            : 0,
        borderRadius: showMajorSurface
          ? borderRadius.lg
          : isConditional
            ? borderRadius.md
            : 0,
        backgroundColor: showConditionalState
          ? surfaces.prayerSectionConditional
          : showMajorSurface
            ? surfaces.prayerSectionSurface
            : 'transparent',
        borderWidth: isConditional ? 1 : 0,
        borderColor: showConditionalState
          ? surfaces.prayerSectionConditionalBorder
          : 'transparent',
      }}
    >
      <View className="mb-4" style={prayerRtlContainer}>
        <Text
          accessibilityRole="header"
          style={{
            ...prayerRtlBlock,
            color: colors.text,
            fontSize: showMajorSurface
              ? Math.max(22, fontSize + 2)
              : Math.max(20, fontSize),
            lineHeight: Math.round(
              (showMajorSurface ? Math.max(22, fontSize + 2) : Math.max(20, fontSize)) *
                1.35,
            ),
            fontWeight: showMajorSurface ? '700' : '600',
          }}
        >
          {section.title}
        </Text>

        {section.availabilityLabel ? (
          <Text
            style={[
              typography.caption,
              prayerRtlBlock,
              {
                color: colors.accent,
                marginTop: 4,
              },
            ]}
          >
            {section.availabilityLabel}
          </Text>
        ) : null}

        {section.availabilityNote ? (
          <Text
            style={[
              typography.caption,
              prayerRtlBlock,
              {
                color: colors.secondary,
                marginTop: 4,
              },
            ]}
          >
            {section.availabilityNote}
          </Text>
        ) : null}
      </View>

      {section.text.map((paragraph, index) => (
        <Text
          key={`${section.id}-${index}`}
          accessibilityRole="text"
          style={{
            ...prayerRtlBlock,
            fontSize,
            lineHeight,
            color: colors.text,
            fontWeight: '400',
            marginBottom:
              index === section.text.length - 1 ? 0 : paragraphSpacing,
          }}
        >
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

interface RitualGuideSectionBlockProps {
  section: RitualGuideSection;
  stepNumber: number | null;
  isLast: boolean;
  fontSize: PrayerFontSize;
  lineHeight: number;
  paragraphSpacing: number;
  sectionSpacing: number;
  onLayout: (y: number) => void;
}

function getRitualKindLabel(kind: RitualGuideSectionKind): string | null {
  switch (kind) {
    case 'action':
      return 'פעולה';
    case 'blessing':
      return 'ברכה';
    case 'instruction':
      return 'הסבר';
    case 'step':
      return 'שלב';
    default:
      return null;
  }
}

function RitualGuideSectionBlock({
  section,
  stepNumber,
  isLast,
  fontSize,
  lineHeight,
  paragraphSpacing,
  sectionSpacing,
  onLayout,
}: RitualGuideSectionBlockProps) {
  const instructionFontSize = Math.max(16, fontSize - 2);
  const kindLabel = getRitualKindLabel(section.kind);

  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout.y)}
      style={{ ...prayerRtlContainer, marginBottom: isLast ? 0 : sectionSpacing }}
    >
      <View className="mb-3 flex-row-reverse items-start gap-3">
        {stepNumber != null ? (
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={[typography.label, { color: colors.white, fontSize: 18 }]}>
              {stepNumber}
            </Text>
          </View>
        ) : null}
        <View className="flex-1" style={prayerRtlContainer}>
          {kindLabel ? (
            <View
              className="mb-1 self-end rounded-full px-3 py-1"
              style={{
                backgroundColor: surfaces.prayerSectionChip,
                flexShrink: 1,
                maxWidth: '100%',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  prayerRtlText,
                  {
                    color: colors.secondary,
                    flexShrink: 1,
                  },
                ]}
              >
                {kindLabel}
              </Text>
            </View>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[
              typography.subtitle,
              prayerRtlBlock,
              {
                color: colors.secondary,
                fontSize: Math.max(18, fontSize - 2),
              },
            ]}
          >
            {section.title}
          </Text>
        </View>
      </View>

      {section.instruction ? (
        <View
          className="mb-3 rounded-2xl px-3 py-3"
          style={{
            ...prayerRtlContainer,
            backgroundColor: surfaces.prayerSectionChip,
          }}
        >
          <View
            className="mb-2 self-end rounded-full px-3 py-1"
            style={{ backgroundColor: surfaces.prayerSectionConditional, flexShrink: 1 }}
          >
            <Text
              style={[
                typography.caption,
                prayerRtlText,
                { color: colors.secondary, flexShrink: 1 },
              ]}
            >
              {section.kind === 'instruction' ? 'הסבר' : 'פעולה'}
            </Text>
          </View>
          <Text
            accessibilityRole="text"
            style={{
              ...prayerRtlBlock,
              fontSize: instructionFontSize,
              lineHeight: Math.round(instructionFontSize * 1.55),
              color:
                section.kind === 'instruction'
                  ? RITUAL_INSTRUCTION_COLOR
                  : RITUAL_ACTION_COLOR,
            }}
          >
            {section.instruction}
          </Text>
        </View>
      ) : null}

      {section.text.map((paragraph, index) => {
        const paragraphIsBlessing =
          section.kind === 'blessing' || paragraph.trim().startsWith('בָּרוּךְ');

        return (
          <View
            key={`${section.id}-${index}`}
            style={{
              marginBottom:
                index === section.text.length - 1 ? 0 : paragraphSpacing,
            }}
          >
            {paragraphIsBlessing ? (
              <View
                className="mb-2 self-end rounded-full px-3 py-1"
                style={{
                  backgroundColor: surfaces.prayerSectionChip,
                  flexShrink: 1,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    prayerRtlText,
                    { color: colors.secondary, flexShrink: 1 },
                  ]}
                >
                  ברכה
                </Text>
              </View>
            ) : null}
            <Text
              accessibilityRole="text"
              style={{
                ...prayerRtlBlock,
                fontSize: paragraphIsBlessing ? fontSize + 1 : fontSize,
                lineHeight: paragraphIsBlessing
                  ? lineHeight
                  : Math.round(instructionFontSize * 1.55),
                color: paragraphIsBlessing ? RITUAL_BLESSING_COLOR : colors.text,
                fontWeight: paragraphIsBlessing ? '500' : '400',
              }}
            >
              {paragraph}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
