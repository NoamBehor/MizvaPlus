export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  EmailConfirmation: { email: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Onboarding: undefined;
  Main: { screen?: keyof MainTabParamList } | undefined;
  MitzvahDetail: { mitzvahId: string };
};

export type MainTabParamList = {
  Home: undefined;
  MyMitzvot: undefined;
  Trivia: undefined;
  Map: undefined;
  Profile: undefined;
};
