export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  EmailConfirmation: { email: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Onboarding: undefined;
  Main: { screen?: keyof MainTabParamList } | undefined;
  MitzvahDetail: { mitzvahId: string };
  PrayerReader: {
    prayerId?: string;
    ritualGuideId?: string;
    nusach: 'edot_hamizrach' | 'ashkenaz' | 'sefard';
  };
  DeveloperDiagnostics: undefined;
  ParashaPodcastPlayer: undefined;
  LegalDocument: { document: 'privacy' | 'accountDeletion' };
};

export type MainTabParamList = {
  Home: undefined;
  MyMitzvot: undefined;
  Trivia: undefined;
  Map: undefined;
  Profile: undefined;
};
