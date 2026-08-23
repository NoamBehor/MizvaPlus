export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  xp: number;
  level: number;
  streakCount: number;
  lastActiveDate: string | null;
}
