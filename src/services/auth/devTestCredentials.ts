import Constants from 'expo-constants';

type DevAuthExtra = {
  devTestAuthConfigured?: boolean;
  devTestEmail?: string;
  devTestPassword?: string;
};

function readDevAuthExtra(): DevAuthExtra {
  if (!__DEV__) {
    return {};
  }

  const extra = Constants.expoConfig?.extra as DevAuthExtra | undefined;
  return extra ?? {};
}

export function isDevTestAccountConfigured(): boolean {
  if (!__DEV__) {
    return false;
  }

  const extra = readDevAuthExtra();
  return Boolean(
    extra.devTestAuthConfigured &&
      extra.devTestEmail &&
      extra.devTestPassword,
  );
}

export function getDevTestCredentials(): { email: string; password: string } | null {
  if (!isDevTestAccountConfigured()) {
    return null;
  }

  const extra = readDevAuthExtra();
  const email = extra.devTestEmail?.trim();
  const password = extra.devTestPassword;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}
