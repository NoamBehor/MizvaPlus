import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnvFile();
const email = process.env.PLAY_SUPPORT_EMAIL ?? env.PLAY_SUPPORT_EMAIL ?? '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';
const accountDeletionUrl =
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? '';

const fullDescription = `מצוות פלוס מרכז את חיי המצווה היומיים במקום אחד.

באפליקציה:
• מצוות יומיות ומעקב התקדמות
• לוח שנה עברי וזמני היום
• בתי כנסת קרובים ודיווח מניין
• פרשת השבוע
• לימוד יומי קצר
• חידון
• תזכורות מקומיות במכשיר

נדרש חשבון כדי לשמור התקדמות. המיקום משמש רק כשהאפליקציה פתוחה, כדי למצוא בתי כנסת, לחשב זמנים ולבדוק מניין. אין פרסומות.

מדיניות פרטיות: ${privacyPolicyUrl}
מחיקת חשבון: ${accountDeletionUrl}
תמיכה: ${email}`;

const listing = {
  language: 'he-IL',
  title: 'מצוות פלוס',
  shortDescription: 'מצוות יומיות, זמני היום, בתי כנסת קרובים ולימוד קצר — במקום אחד.',
  fullDescription,
  contactEmail: email,
  privacyPolicyUrl,
  accountDeletionUrl,
  category: 'LIFESTYLE',
  free: true,
};

writeFileSync(join(root, 'store/play/listing.json'), `${JSON.stringify(listing, null, 2)}\n`);
console.log('PASS write-play-listing');
console.log(`title_len=${listing.title.length}`);
console.log(`short_len=${listing.shortDescription.length}`);
console.log(`full_len=${listing.fullDescription.length}`);
