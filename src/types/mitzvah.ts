export type MitzvahCategory = 'daily' | 'fast' | 'holiday';

export interface Mitzvah {
  id: string;
  title: string;
  category: MitzvahCategory;
  description: string;
  fullContentHebrew: string;
  xpReward: number;
  defaultTime?: string;
}

export interface UserMitzvahPreference {
  userId: string;
  mitzvahId: string;
  enabled: boolean;
  reminderEnabled: boolean;
  /**
   * Local device time in HH:mm format.
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
