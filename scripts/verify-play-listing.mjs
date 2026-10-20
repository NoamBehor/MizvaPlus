import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnvFile();
const email = process.env.PLAY_SUPPORT_EMAIL ?? env.PLAY_SUPPORT_EMAIL ?? '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pngSize(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    fail(`${path} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

if (!email) {
  fail('PLAY_SUPPORT_EMAIL is required');
}

const listing = JSON.parse(readFileSync(join(root, 'store/play/listing.json'), 'utf8'));
if (listing.language !== 'he-IL') fail('language');
if (listing.title.length > 30) fail('title length');
if (listing.shortDescription.length > 80) fail('short description length');
if (listing.fullDescription.length > 4000) fail('full description length');
if (listing.contactEmail !== email) fail('contact email mismatch');
if (listing.privacyPolicyUrl !== privacyPolicyUrl) fail('privacy policy url mismatch');
if (listing.category !== 'LIFESTYLE' || listing.free !== true) fail('category');
if (!listing.fullDescription.includes('אין פרסומות')) fail('full description missing ads statement');

const icon = pngSize(join(root, 'store/play/icon-512.png'));
if (icon.width !== 512 || icon.height !== 512) fail('icon dimensions');

const feature = pngSize(join(root, 'store/play/feature-graphic-1024x500.png'));
if (feature.width !== 1024 || feature.height !== 500) fail('feature graphic dimensions');

const shots = ['01-home.png', '02-map.png', '03-prayer.png', '04-profile.png'];
if (shots.length < 2) fail('screenshots');
for (const name of shots) {
  const size = pngSize(join(root, 'store/play/screenshots', name));
  if (size.width < 320 || size.height < 320 || size.width > 3840 || size.height > 3840) {
    fail(`screenshot ${name} dimensions`);
  }
}

console.log('PASS verify-play-listing');
