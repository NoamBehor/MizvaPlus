import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

const profile = read('src/screens/profile/ProfileScreen.tsx');
const banner = read('src/components/profile/ProfileManageMitzvotBanner.tsx');

if (!profile.includes('ProfileManageMitzvotBanner')) {
  fail('ProfileScreen does not render ProfileManageMitzvotBanner');
}

const accountIdx = profile.indexOf('<ProfileAccountCard');
const bannerIdx = profile.indexOf('<ProfileManageMitzvotBanner');
const minyanIdx = profile.indexOf('<MinyanProximityAlertSettings');

if (accountIdx < 0 || bannerIdx < 0 || minyanIdx < 0) {
  fail('Profile screen missing expected sections');
}

if (!(accountIdx < bannerIdx && bannerIdx < minyanIdx)) {
  fail('Manage mitzvot banner must sit between account card and minyan settings');
}

if (!banner.includes('ניהול המצוות שלי')) {
  fail('Banner missing Hebrew title');
}

if (!banner.includes('navigateToMyMitzvot')) {
  fail('Banner must navigate to My Mitzvot');
}

if (!banner.includes('profile-manage-mitzvot-banner')) {
  fail('Banner missing testID for native QA');
}

console.log('PASS verify-profile-stitch-ui');
