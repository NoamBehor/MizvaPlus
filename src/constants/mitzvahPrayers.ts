/**

 * Liturgical prayer snippets — deprecated for mitzvah detail display.

 * Full prayer text lives in bundled reader documents under src/content/prayers/.

 */



export interface MitzvahPrayerSection {

  heading?: string;

  text: string;

}



export interface MitzvahPrayerContent {

  sections: MitzvahPrayerSection[];

}



/** @deprecated Use Prayer Reader bundled content instead of embedded snippets. */

export const MITZVAH_PRAYERS: Record<string, MitzvahPrayerContent> = {};


