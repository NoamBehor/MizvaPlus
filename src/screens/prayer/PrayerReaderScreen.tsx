import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NusachAvailabilityRow } from '@/components/prayer/NusachChipRow';
import { PrayerReaderAudioControls } from '@/components/prayer/PrayerReaderAudioControls';
import { PrayerSectionBlock } from '@/components/prayer/PrayerSectionBlock';
import { RitualGuideSectionBlock } from '@/components/prayer/RitualGuideSectionBlock';
import { SectionNavigator } from '@/components/prayer/SectionJumpChips';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { SHACHARIT_TOC_CATEGORIES } from '@/constants/shacharitStructure';
import {
  prayerRtlBlock,
  prayerRtlContainer,
  prayerRtlText,
} from '@/constants/prayerReaderLayout';
import { spacing, surfaces, typography } from '@/constants/theme';
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
type PrayerReaderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'PrayerReader'
>;

export function PrayerReaderScreen({
  navigation,
  route,
}: PrayerReaderScreenProps) {
  const insets = useSafeAreaInsets();
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
        style={{
          flex: 1,
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.sm,
          backgroundColor: surfaces.prayerReaderBackground,
        }}
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
      <View
        style={{
          ...prayerRtlContainer,
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.sm,
        }}
      >
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
                paragraphSpacing={paragraphSpacing}
                sectionSpacing={sectionSpacing}
                onLayout={(y) => handleSectionLayout(section.id, y)}
              />
            ))}
      </ScrollView>

      <PrayerReaderAudioControls content={audioContent} title={readerTitle} />

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
  const fontsLoaded = useHomeFonts();

  return (
    <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: surfaces.prayerSectionChip,
          }}
        >
          <Text style={[typography.label, { color: colors.sacredInk }]}>→</Text>
        </Pressable>

        <Text
          numberOfLines={1}
          style={[
            typography.subtitle,
            prayerRtlText,
            homeFontStyle(fontsLoaded, homeFonts.sacredBold),
            { flex: 1, color: colors.sacredInk, fontSize: 20, lineHeight: 32 },
          ]}
        >
          {title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <FontControlButton
            label="א-"
            accessibilityLabel="הקטן גופן"
            onPress={onDecreaseFontSize}
            disabled={!canDecrease}
          />
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { minWidth: 24, textAlign: 'center', color: colors.sacredSlate },
            ]}
          >
            {fontSize}
          </Text>
          <FontControlButton
            label="א+"
            accessibilityLabel="הגדל גופן"
            onPress={onIncreaseFontSize}
            disabled={!canIncrease}
          />
        </View>
      </View>

      {nusachLabel ? (
        <Text
          style={[
            typography.caption,
            prayerRtlBlock,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            { color: colors.sacredAmber },
          ]}
        >
          {nusachLabel}
        </Text>
      ) : null}
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
      style={{
        backgroundColor: surfaces.prayerSectionChip,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={[typography.label, { fontSize: 14, color: colors.sacredInk }]}>
        {label}
      </Text>
    </Pressable>
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
          <View className="mb-4 flex-row items-center justify-between">
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
      <View className="flex-row gap-3">
        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="המשך מהמקום האחרון"
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: colors.sacredNavy, minHeight: 40 }}
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

