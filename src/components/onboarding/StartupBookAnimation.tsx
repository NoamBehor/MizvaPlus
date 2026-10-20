import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  STARTUP_TORAH_PAGES,
  type StartupTorahPage,
} from '@/constants/startupTorahPages';
import { startupTheme } from '@/constants/startupTheme';
import { typography } from '@/constants/theme';

const BOOK_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const PAGE_EASE = Easing.inOut(Easing.cubic);
const PERSPECTIVE = 1400;

const PAGE_TURN_DURATION = 920;
const PAGE_SETTLE_PAUSE = 80;
const COVER_OPEN_DURATION = 680;
const COVER_OPEN_DELAY = 320;
const MIN_PAGE_TURNS_BEFORE_EXIT = 2;
const PAGE_COUNT = STARTUP_TORAH_PAGES.length;

function wrapPageIndex(index: number): number {
  return ((index % PAGE_COUNT) + PAGE_COUNT) % PAGE_COUNT;
}

type StartupBookAnimationProps = {
  /** App initialization + deep-link bootstrap are complete. */
  isAppReady?: boolean;
  onAnimationComplete?: () => void;
};

type BookMetrics = {
  bookWidth: number;
  bookHeight: number;
  coverInset: number;
  spineWidth: number;
  pageWidth: number;
  pageHeight: number;
  stackDepth: number;
};

function useBookMetrics(): BookMetrics {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 56, 340);
  const maxHeight = screenHeight * 0.38;
  const spreadAspect = 1.58;
  let bookWidth = maxWidth;
  let bookHeight = bookWidth / spreadAspect;
  if (bookHeight > maxHeight) {
    bookHeight = maxHeight;
    bookWidth = bookHeight * spreadAspect;
  }

  const coverInset = Math.max(5, Math.round(bookWidth * 0.018));
  const spineWidth = Math.max(6, Math.round(bookWidth * 0.022));
  const innerWidth = bookWidth - coverInset * 2;
  const pageWidth = (innerWidth - spineWidth) / 2;
  const pageHeight = bookHeight - coverInset * 2 - 6;
  const stackDepth = Math.max(5, Math.round(bookWidth * 0.024));

  return {
    bookWidth,
    bookHeight,
    coverInset,
    spineWidth,
    pageWidth,
    pageHeight,
    stackDepth,
  };
}

function TorahPageContent({
  page,
  muted = false,
  compact = false,
}: {
  page: StartupTorahPage;
  muted?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={styles.pageContent}>
      <View style={styles.pageTopSpace} />
      <Text
        style={[
          typography.body,
          styles.pageText,
          compact && styles.pageTextCompact,
          { color: startupTheme.titleColor, opacity: muted ? 0.62 : 0.9 },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {page.text}
      </Text>
      {page.mark ? (
        <Text
          style={[
            typography.caption,
            styles.pageMark,
            { color: startupTheme.subtitleColor, opacity: muted ? 0.35 : 0.55 },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {page.mark}
        </Text>
      ) : null}
    </View>
  );
}

function PageFace({
  width,
  height,
  children,
  paperTone,
}: {
  width: number;
  height: number;
  children: ReactNode;
  paperTone: 'front' | 'back';
}) {
  return (
    <View
      style={[
        styles.pageFace,
        {
          width,
          height,
          backgroundColor:
            paperTone === 'front'
              ? startupTheme.pageSurface
              : startupTheme.pagePaper,
          borderColor: startupTheme.headerBorder,
        },
      ]}
    >
      <LinearGradient
        colors={
          paperTone === 'front'
            ? ['rgba(74,40,24,0.1)', 'rgba(74,40,24,0)', 'rgba(74,40,24,0)']
            : ['rgba(74,40,24,0.07)', 'rgba(74,40,24,0)', 'rgba(74,40,24,0)']
        }
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.spineShade}
      />
      <LinearGradient
        colors={['rgba(74,40,24,0)', 'rgba(74,40,24,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.pageBottomShade}
      />
      {children}
    </View>
  );
}

function TurningPage({
  rotation,
  width,
  height,
  frontPage,
  backPage,
}: {
  rotation: SharedValue<number>;
  width: number;
  height: number;
  frontPage: StartupTorahPage;
  backPage: StartupTorahPage;
}) {
  const pageStyle = useAnimatedStyle(() => {
    const rotateY = rotation.value;
    const lift = interpolate(rotateY, [0, -90, -180], [0, -4, 0]);
    const shadowOpacity = interpolate(
      Math.abs(rotateY),
      [0, 45, 90, 135, 180],
      [0.06, 0.2, 0.28, 0.2, 0.06],
    );

    return {
      zIndex: rotateY > -90 ? 40 : 8,
      shadowOpacity,
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: width / 2 },
        { translateY: lift },
        { rotateY: `${rotateY}deg` },
        { translateX: -width / 2 },
      ],
    };
  });

  const frontFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value > -90 ? 1 : 0,
  }));

  const backFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value <= -90 ? 1 : 0,
  }));

  return (
    <Animated.View
      style={[
        styles.turningPage,
        {
          width,
          height,
          shadowColor: startupTheme.bookCoverEdge,
          shadowOffset: { width: -3, height: 2 },
          shadowRadius: 10,
          elevation: 7,
        },
        pageStyle,
      ]}
    >
      <Animated.View style={[styles.pageFaceContainer, frontFaceStyle]}>
        <PageFace width={width} height={height} paperTone="front">
          <TorahPageContent page={frontPage} />
        </PageFace>
      </Animated.View>
      <Animated.View
        style={[styles.pageFaceContainer, styles.pageFaceBack, backFaceStyle]}
      >
        <PageFace width={width} height={height} paperTone="back">
          <TorahPageContent page={backPage} muted />
        </PageFace>
      </Animated.View>
    </Animated.View>
  );
}

function PageStackEdge({
  side,
  depth,
  height,
}: {
  side: 'left' | 'right';
  depth: number;
  height: number;
}) {
  const layers = Array.from({ length: 5 }, (_, index) => index);

  return (
    <View
      style={[
        styles.stackEdge,
        side === 'left' ? styles.stackEdgeLeft : styles.stackEdgeRight,
        { height, width: depth + 4 },
      ]}
    >
      {layers.map((layer) => (
        <View
          key={`${side}-${layer}`}
          style={[
            styles.stackEdgeLine,
            side === 'left'
              ? { right: layer * 0.9, opacity: 0.18 + layer * 0.06 }
              : { left: layer * 0.9, opacity: 0.18 + layer * 0.06 },
          ]}
        />
      ))}
    </View>
  );
}

export function StartupBookAnimation({
  isAppReady = false,
  onAnimationComplete,
}: StartupBookAnimationProps) {
  const metrics = useBookMetrics();
  const {
    bookWidth,
    bookHeight,
    coverInset,
    spineWidth,
    pageWidth,
    pageHeight,
    stackDepth,
  } = metrics;

  const sceneOpacity = useSharedValue(0);
  const bookScale = useSharedValue(0.9);
  const bookLift = useSharedValue(12);
  const coverRotation = useSharedValue(0);
  const spreadOpacity = useSharedValue(0);
  const turningRotation = useSharedValue(0);
  const exitOpacity = useSharedValue(1);
  const exitScale = useSharedValue(1);

  const spreadPageIndexRef = useRef(0);
  const turnCountRef = useRef(0);
  const isTurningRef = useRef(false);
  const isExitingRef = useRef(false);
  const isAppReadyRef = useRef(isAppReady);

  const [leftPageIndex, setLeftPageIndex] = useState(0);
  const [turnFrontIndex, setTurnFrontIndex] = useState(1);
  const [turnBackIndex, setTurnBackIndex] = useState(2);

  const markComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const startExitAnimation = useCallback(() => {
    if (isExitingRef.current) {
      return;
    }
    isExitingRef.current = true;

    exitScale.value = withSequence(
      withTiming(0.98, { duration: 420, easing: BOOK_EASE }),
      withTiming(0.96, { duration: 280, easing: BOOK_EASE }),
    );
    exitOpacity.value = withDelay(
      260,
      withTiming(0, { duration: 520, easing: BOOK_EASE }, (finished) => {
        if (finished) {
          runOnJS(markComplete)();
        }
      }),
    );
  }, [exitOpacity, exitScale, markComplete]);

  const releaseTurnLock = useCallback(() => {
    isTurningRef.current = false;
  }, []);

  const scheduleNextTurnRef = useRef<() => void>(() => undefined);

  const handleTurnFinished = useCallback(
    (nextLeftIndex: number) => {
      spreadPageIndexRef.current = wrapPageIndex(nextLeftIndex);
      setLeftPageIndex(wrapPageIndex(nextLeftIndex));
      setTurnFrontIndex(wrapPageIndex(nextLeftIndex + 1));
      setTurnBackIndex(wrapPageIndex(nextLeftIndex + 2));
      turnCountRef.current += 1;
      isTurningRef.current = false;
      turningRotation.value = 0;

      if (
        isAppReadyRef.current &&
        turnCountRef.current >= MIN_PAGE_TURNS_BEFORE_EXIT
      ) {
        startExitAnimation();
        return;
      }

      setTimeout(() => {
        scheduleNextTurnRef.current();
      }, PAGE_SETTLE_PAUSE);
    },
    [setLeftPageIndex, startExitAnimation, turningRotation],
  );

  const scheduleNextTurn = useCallback(() => {
    if (isExitingRef.current || isTurningRef.current) {
      return;
    }

    const turningPageIndex = wrapPageIndex(spreadPageIndexRef.current + 1);
    const nextLeftIndex = turningPageIndex;
    const backPageIndex = wrapPageIndex(spreadPageIndexRef.current + 2);

    isTurningRef.current = true;
    setTurnFrontIndex(turningPageIndex);
    setTurnBackIndex(backPageIndex);
    turningRotation.value = 0;

    turningRotation.value = withTiming(
      -180,
      { duration: PAGE_TURN_DURATION, easing: PAGE_EASE },
      (finished) => {
        if (finished) {
          runOnJS(handleTurnFinished)(nextLeftIndex);
        } else {
          runOnJS(releaseTurnLock)();
        }
      },
    );
  }, [
    handleTurnFinished,
    releaseTurnLock,
    setTurnBackIndex,
    setTurnFrontIndex,
    turningRotation,
  ]);

  scheduleNextTurnRef.current = scheduleNextTurn;

  const beginPageTurns = useCallback(() => {
    spreadPageIndexRef.current = 0;
    setLeftPageIndex(0);
    setTurnFrontIndex(1);
    setTurnBackIndex(2);
    turnCountRef.current = 0;
    scheduleNextTurn();
  }, [scheduleNextTurn, setLeftPageIndex, setTurnBackIndex, setTurnFrontIndex]);

  useEffect(() => {
    isAppReadyRef.current = isAppReady;
    if (
      isAppReady &&
      !isExitingRef.current &&
      !isTurningRef.current &&
      turnCountRef.current >= MIN_PAGE_TURNS_BEFORE_EXIT
    ) {
      startExitAnimation();
    }
  }, [isAppReady, startExitAnimation]);

  useEffect(() => {
    sceneOpacity.value = withTiming(1, { duration: 480, easing: BOOK_EASE });
    bookScale.value = withTiming(1, { duration: 900, easing: BOOK_EASE });
    bookLift.value = withTiming(0, { duration: 900, easing: BOOK_EASE });

    coverRotation.value = withDelay(
      COVER_OPEN_DELAY,
      withTiming(-162, { duration: COVER_OPEN_DURATION, easing: PAGE_EASE }),
    );

    spreadOpacity.value = withDelay(
      COVER_OPEN_DELAY + 240,
      withTiming(1, { duration: 460, easing: BOOK_EASE }),
    );

    const pageTurnStart =
      COVER_OPEN_DELAY + COVER_OPEN_DURATION + 160;
    const timer = setTimeout(() => {
      beginPageTurns();
    }, pageTurnStart);

    return () => clearTimeout(timer);
  }, [
    beginPageTurns,
    bookLift,
    bookScale,
    coverRotation,
    sceneOpacity,
    spreadOpacity,
  ]);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value * exitOpacity.value,
  }));

  const bookContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bookLift.value },
      { scale: bookScale.value * exitScale.value },
    ],
  }));

  const coverWidth = pageWidth + coverInset;

  const coverStyle = useAnimatedStyle(() => {
    const shadowStrength = interpolate(
      Math.abs(coverRotation.value),
      [0, 90, 162],
      [0.12, 0.22, 0.08],
    );

    return {
      shadowOpacity: shadowStrength,
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: -coverWidth / 2 },
        { rotateY: `${coverRotation.value}deg` },
        { translateX: coverWidth / 2 },
      ],
    };
  });

  const spreadStyle = useAnimatedStyle(() => ({
    opacity: spreadOpacity.value,
  }));

  const innerLeft = coverInset;
  const innerTop = coverInset + 3;
  const turningLeft = innerLeft + spineWidth + pageWidth + 1;

  const leftPage = STARTUP_TORAH_PAGES[wrapPageIndex(leftPageIndex)];
  const frontPage = STARTUP_TORAH_PAGES[wrapPageIndex(turnFrontIndex)];
  const backPage = STARTUP_TORAH_PAGES[wrapPageIndex(turnBackIndex)];

  return (
    <Animated.View
      style={[styles.scene, sceneStyle]}
      accessibilityRole="image"
      accessibilityLabel="ספר פתוח עם דפי תורה"
    >
      <Animated.View style={[styles.bookStage, bookContainerStyle]}>
        <View
          style={[
            styles.groundShadow,
            {
              width: bookWidth * 0.88,
              bottom: -8,
              shadowColor: startupTheme.bookCoverEdge,
            },
          ]}
        />

        <View
          style={[
            styles.bookShell,
            {
              width: bookWidth,
              height: bookHeight,
              backgroundColor: startupTheme.bookCover,
              borderColor: startupTheme.bookCoverEdge,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.14)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              styles.innerSpread,
              {
                left: innerLeft,
                top: innerTop,
                width: pageWidth * 2 + spineWidth + 1,
                height: pageHeight,
              },
            ]}
          >
            <PageStackEdge side="left" depth={stackDepth} height={pageHeight} />
            <PageStackEdge
              side="right"
              depth={stackDepth}
              height={pageHeight}
            />

            <View
              style={[
                styles.spine,
                {
                  left: 0,
                  width: spineWidth,
                  height: pageHeight,
                  backgroundColor: startupTheme.bookSpine,
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.22)',
                  'rgba(0,0,0,0.04)',
                  'rgba(0,0,0,0.16)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <Animated.View
              style={[
                styles.spread,
                { left: spineWidth, height: pageHeight },
                spreadStyle,
              ]}
            >
              <View
                style={[
                  styles.spreadPage,
                  {
                    width: pageWidth,
                    height: pageHeight,
                    backgroundColor: startupTheme.pagePaper,
                    borderColor: startupTheme.headerBorder,
                  },
                ]}
              >
                <TorahPageContent page={leftPage} muted />
              </View>

              <View style={[styles.spineGutter, { height: pageHeight }]} />

              <View
                style={[
                  styles.spreadPage,
                  {
                    width: pageWidth,
                    height: pageHeight,
                    backgroundColor: startupTheme.pageSurface,
                    borderColor: startupTheme.headerBorder,
                  },
                ]}
              >
                <TorahPageContent page={frontPage} compact />
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.turningLayer,
                {
                  left: turningLeft,
                  top: 0,
                  width: pageWidth,
                  height: pageHeight,
                },
                spreadStyle,
              ]}
            >
              <TurningPage
                rotation={turningRotation}
                width={pageWidth}
                height={pageHeight}
                frontPage={frontPage}
                backPage={backPage}
              />
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.cover,
              {
                left: innerLeft + spineWidth,
                top: coverInset,
                width: pageWidth + coverInset,
                height: bookHeight - coverInset * 2,
                backgroundColor: startupTheme.bookCover,
                borderColor: startupTheme.bookCoverEdge,
                shadowColor: startupTheme.bookCoverEdge,
              },
              coverStyle,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(201,162,39,0.12)',
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.18)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.coverBand,
                { backgroundColor: startupTheme.accentLine, opacity: 0.38 },
              ]}
            />
            <Text
              style={[
                typography.title,
                styles.coverTitle,
                { color: startupTheme.pagePaper },
              ]}
            >
              מצוות פלוס
            </Text>
            <View
              style={[
                styles.coverRule,
                { backgroundColor: startupTheme.accentLine, opacity: 0.5 },
              ]}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
    direction: 'ltr',
  },
  bookStage: {
    alignItems: 'center',
    direction: 'ltr',
  },
  groundShadow: {
    position: 'absolute',
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(74,40,24,0.07)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 3,
  },
  bookShell: {
    position: 'relative',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    direction: 'ltr',
  },
  innerSpread: {
    position: 'absolute',
    direction: 'ltr',
  },
  spine: {
    position: 'absolute',
    top: 0,
    borderRadius: 1,
    overflow: 'hidden',
  },
  spread: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    direction: 'ltr',
  },
  spreadPage: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  spineGutter: {
    width: 1,
    backgroundColor: 'rgba(74,40,24,0.14)',
  },
  spineShade: {
    ...StyleSheet.absoluteFill,
  },
  pageBottomShade: {
    ...StyleSheet.absoluteFill,
  },
  turningLayer: {
    position: 'absolute',
    direction: 'ltr',
  },
  turningPage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pageFaceContainer: {
    ...StyleSheet.absoluteFill,
  },
  pageFaceBack: {
    transform: [{ rotateY: '180deg' }],
  },
  pageFace: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pageContent: {
    flex: 1,
    alignItems: 'flex-end',
    direction: 'rtl',
  },
  pageTopSpace: {
    height: 6,
  },
  pageText: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pageTextCompact: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  pageMark: {
    marginTop: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
    alignSelf: 'center',
  },
  stackEdge: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    justifyContent: 'center',
  },
  stackEdgeLeft: {
    left: -4,
  },
  stackEdgeRight: {
    right: -4,
  },
  stackEdgeLine: {
    position: 'absolute',
    width: 1,
    top: 4,
    bottom: 4,
    backgroundColor: startupTheme.pageEdge,
  },
  cover: {
    position: 'absolute',
    borderWidth: 1,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
    direction: 'ltr',
  },
  coverBand: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 999,
  },
  coverTitle: {
    fontSize: 21,
    textAlign: 'center',
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  coverRule: {
    position: 'absolute',
    bottom: 20,
    width: 40,
    height: 2,
    borderRadius: 999,
  },
});
