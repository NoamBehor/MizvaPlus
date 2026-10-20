export type MitzvahCategory = 'daily' | 'fast' | 'holiday';

export interface Mitzvah {
  id: string;
  title: string;
  category: MitzvahCategory;
  description: string;
  /** Short user-facing explanation shown on the detail screen. */
  explanationHebrew?: string;
  fullContentHebrew: string;
  /** Mitzvah id key into MITZVAH_PRAYERS when liturgical text exists. */
  prayerId?: string;
  xpReward: number;
  defaultTime?: string;
}

export interface UserMitzvahPreference {
  userId: string;
  mitzvahId: string;
  enabled: boolean;
  reminderEnabled: boolean;
  /**
   * Israel wall-clock time in HH:mm (Asia/Jerusalem).
   * Example: "07:30"
   */
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MitzvahCompletion {
  id: string;
  userId: string;
  mitzvahId: string;
  completedAt: string;
  completionDate: string;
  xpAwarded: number;
}
