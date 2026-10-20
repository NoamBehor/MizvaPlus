/**
 * Development authentication verification.
 * Run: npm run verify:dev-auth
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const HEBREW_ERRORS = {
  'Invalid login credentials': 'אימייל או סיסמה שגויים',
  'Email not confirmed': 'יש לאשר את כתובת האימייל לפני ההתחברות',
};

function translateAuthErrorMessage(message) {
  return HEBREW_ERRORS[message] ?? 'אירעה שגיאה. נסה שוב.';
}

function inferUserExistsHint(code, message) {
  const normalizedCode = (code ?? '').toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedCode === 'email_not_confirmed' ||
    normalizedMessage.includes('email not confirmed')
  ) {
    return 'email_unconfirmed';
  }

  if (
    normalizedCode === 'invalid_credentials' ||
    normalizedMessage.includes('invalid login credentials')
  ) {
    return 'unknown';
  }

  return 'unknown';
}

function runAuthDiagnosticsTests() {
  record(
    'auth diagnostics: email not confirmed hint',
    inferUserExistsHint('email_not_confirmed', 'Email not confirmed') === 'email_unconfirmed',
  );
  record(
    'auth diagnostics: invalid credentials stays unknown',
    inferUserExistsHint('invalid_credentials', 'Invalid login credentials') === 'unknown',
  );
  record(
    'auth diagnostics: Hebrew translation for invalid credentials',
    translateAuthErrorMessage('Invalid login credentials') === 'אימייל או סיסמה שגויים',
  );
  record(
    'auth diagnostics: unknown errors stay generic',
    translateAuthErrorMessage('Unexpected upstream failure') === 'אירעה שגיאה. נסה שוב.',
  );
}

function runStaticAuthTests() {
  const authTs = read('src/services/auth.ts');
  const authScreen = read('src/screens/auth/AuthScreen.tsx');
  const splashScreen = read('src/screens/onboarding/SplashScreen.tsx');
  const navigationRef = read('src/navigation/navigationRef.ts');
  const devAuthBypass = read('src/services/auth/devAuthBypass.ts');
  const devAnonymousAuth = read('src/services/auth/devAnonymousAuth.ts');
  const appInitialization = read('src/hooks/useAppInitialization.ts');
  const syncService = read('src/services/cloud/syncService.ts');
  const appConfig = read('app.config.js');
  const envExample = read('.env.example');
  const devCreds = read('src/services/auth/devTestCredentials.ts');
  const diagnostics = read('src/services/auth/authDiagnostics.ts');
  const profileScreen = read('src/screens/profile/ProfileScreen.tsx');
  const diagnosticsScreen = read('src/screens/dev/DiagnosticsScreen.tsx');

  record(
    'dev bypass: module guarded by __DEV__',
    devAuthBypass.includes('return __DEV__'),
  );
  record(
    'dev bypass: splash skips Auth screen in development',
    splashScreen.includes('isDevAuthBypassActive()') &&
      splashScreen.includes("navigation.replace('Main')"),
  );
  record(
    'dev bypass: navigateToAuth redirects to Main in development',
    navigationRef.includes('isDevAuthBypassActive()') &&
      navigationRef.includes('navigateToMain()'),
  );
  record(
    'dev bypass: production Auth route unchanged',
    navigationRef.includes("routes: [{ name: 'Auth' }]"),
  );
  record(
    'dev bypass: no fake JWT fabrication',
    !devAuthBypass.match(/access_token|fake.*jwt|mock.*session/i) &&
      !splashScreen.match(/fake.*jwt|mock.*session/i),
  );
  record(
    'dev bypass: no fake user ID',
    !devAuthBypass.match(/fake.*user|hardcoded.*user|setAuthenticated\(true\)/i) &&
      !devAnonymousAuth.match(/AsyncStorage|demo-user|fake.*uuid/i),
  );
  record(
    'dev anonymous: signInAnonymously only in development',
    devAnonymousAuth.includes('signInAnonymously') &&
      devAnonymousAuth.includes('!__DEV__') &&
      appInitialization.includes('ensureDevAnonymousSession'),
  );
  record(
    'dev anonymous: bootstrap creates real session before main app',
    appInitialization.includes('ensureDevAnonymousSession()') &&
      appInitialization.includes('session.user.is_anonymous'),
  );
  record(
    'dev anonymous: diagnostics expose anonymous mode',
    devAuthBypass.includes('DEV ANONYMOUS') &&
      diagnosticsScreen.includes('Anonymous') &&
      devAuthBypass.includes('מצב פיתוח — משתמש אנונימי'),
  );
  record(
    'dev anonymous: web preview does not override authenticated anonymous diagnostics',
    !devAuthBypass.match(/isDevPreviewMode\(\)[\s\S]{0,120}anonymous:\s*false/) &&
      devAuthBypass.includes('isAuthenticated && options?.isAnonymous'),
  );
  record(
    'dev anonymous: classified failure exposed in diagnostics',
    devAnonymousAuth.includes('getDevAnonymousAuthFailure') &&
      devAnonymousAuth.includes('ANONYMOUS_SIGN_IN_DISABLED') &&
      diagnosticsScreen.includes('Auth failure classification'),
  );
  record(
    'dev anonymous: web map no fake guest auth message',
    !read('src/screens/map/MapScreen.web.tsx').includes('לא זמין בתצוגת פיתוח'),
  );
  record(
    'dev anonymous: no token exposure in diagnostics source',
    !devAnonymousAuth.match(/access_token|refresh_token|jwt/i) &&
      !diagnosticsScreen.match(/access token|refresh token|JWT/i),
  );
  record(
    'dev bypass: no service-role credential usage',
    !devAuthBypass.includes('SERVICE_ROLE') &&
      !syncService.includes('SERVICE_ROLE'),
  );
  record(
    'dev bypass: cloud sync skipped without session',
    syncService.includes('shouldSkipDevBypassCloudSync') &&
      syncService.includes('logDevAuthBypassCloudSyncSkipped'),
  );
  record(
    'dev bypass: diagnostics banner text',
    devAuthBypass.includes('מצב פיתוח — ללא התחברות') ||
      devAuthBypass.includes('מצב פיתוח — משתמש אנונימי'),
  );
  record(
    'dev bypass: profile shows development status',
    profileScreen.includes('getDevAuthBannerLabel') &&
      profileScreen.includes('isDevAuthBypassActive'),
  );
  record(
    'dev bypass: diagnostics auth section',
    diagnosticsScreen.includes('Auth mode') &&
      diagnosticsScreen.includes('getDevAuthDiagnostics'),
  );
  record(
    'auth: signInWithDevTestAccount guarded by __DEV__',
    authTs.includes('signInWithDevTestAccount') && authTs.includes('if (!__DEV__)'),
  );
  record(
    'auth: AuthFailure preserves structured diagnostics',
    authTs.includes('AuthFailure') && read('src/services/auth/authFailure.ts').includes('AuthFailureDetails'),
  );
  record(
    'auth: login failures log diagnostics',
    diagnostics.includes('logAuthFailureDiagnostics') &&
      authTs.includes('logAuthFailureDiagnostics'),
  );
  record(
    'auth: session gate probe exists',
    diagnostics.includes('readRootAuthGateSession'),
  );
  record(
    'auth screen: dev quick sign-in hidden during bypass',
    authScreen.includes('!isDevAuthBypassActive()') &&
      authScreen.includes('כניסה מהירה לפיתוח'),
  );
  record(
    'auth screen: production login UI preserved',
    authScreen.includes('ברוך שובך') && authScreen.includes('signInWithEmail'),
  );
  record(
    'dev credentials: not EXPO_PUBLIC',
    !envExample.includes('EXPO_PUBLIC_DEV_TEST') &&
      envExample.includes('DEV_TEST_EMAIL') &&
      envExample.includes('DEV_TEST_PASSWORD'),
  );
  record(
    'dev credentials: runtime reads expo extra only in __DEV__',
    devCreds.includes('Constants.expoConfig?.extra') && devCreds.includes('if (!__DEV__)'),
  );
  record(
    'app.config: injects dev test auth via extra',
    appConfig.includes('devTestAuthConfigured') &&
      appConfig.includes('DEV_TEST_EMAIL') &&
      appConfig.includes('DEV_TEST_PASSWORD'),
  );
  record(
    'auth: no hardcoded dev passwords in source',
    !authTs.match(/password\s*[:=]\s*['"][^'"]+['"]/i) &&
      !authScreen.match(/password\s*[:=]\s*['"][^'"]+['"]/i),
  );
  record(
    'auth session hook: logs session cleared diagnostics',
    read('src/hooks/useAuthSession.ts').includes('auth_state_session_cleared'),
  );
  record(
    'auth session hook: dev logout returns to Main',
    read('src/hooks/useAuthSession.ts').includes('navigateToMain()'),
  );
  record(
    'auth: shared post-sign-in bootstrap',
    read('src/services/auth/completeAuthenticatedSignIn.ts').includes(
      'completeAuthenticatedSignIn',
    ),
  );
}

function main() {
  console.log('Dev Auth Verification\n=====================\n');
  runAuthDiagnosticsTests();
  runStaticAuthTests();

  const failed = results.filter((item) => !item.pass);
  const passed = results.length - failed.length;
  console.log(`\n${passed}/${results.length} passed`);

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const failure of failed) {
      console.log(`  - ${failure.name}${failure.detail ? `: ${failure.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

main();
