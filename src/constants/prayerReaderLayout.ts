import type { TextStyle, ViewStyle } from 'react-native';

/** Shared RTL presentation for prayer reader text blocks. */
export const prayerRtlText: TextStyle = {
  textAlign: 'right',
  writingDirection: 'rtl',
};

export const prayerRtlBlock: TextStyle = {
  ...prayerRtlText,
  alignSelf: 'stretch',
};

export const prayerRtlContainer: ViewStyle = {
  alignSelf: 'stretch',
  width: '100%',
};

/** Niqqud needs about twice the font size so marks do not collide. */
export const SACRED_LINE_HEIGHT_RATIO = 2;

/**
 * Major liturgical blocks that receive elevated surface styling in the reader.
 * Small opening sections (e.g. modeh-ani) stay inline to preserve a siddur feel.
 */
export const PRAYER_MAJOR_SURFACE_SECTION_IDS = new Set([
  'korbanot',
  'pesukei-dzimra',
  'kriat-shema',
  'amida',
  'tachanun',
  'alenu',
  'arvit-shema',
  'birkot-kriat-shema',
  'parshat-shema',
  'vehaya-im-shamoa',
]);

export function isMajorPrayerSurfaceSection(sectionId: string): boolean {
  return PRAYER_MAJOR_SURFACE_SECTION_IDS.has(sectionId);
}
