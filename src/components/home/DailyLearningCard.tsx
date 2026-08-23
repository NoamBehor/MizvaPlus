import { useMemo } from 'react';
import { Text } from 'react-native';

import { Card } from '@/components/common/Card';
import { typography } from '@/constants/theme';
import { getDailyQuoteForDate } from '@/utils/dailyQuote';

export function DailyLearningCard() {
  const quote = useMemo(() => getDailyQuoteForDate(), []);

  return (
    <Card className="mb-4">
      <Text style={[typography.label, { marginBottom: 12 }]}>לימוד יומי</Text>
      <Text style={[typography.body, { fontStyle: 'italic' }]}>
        &ldquo;{quote.textHebrew}&rdquo;
      </Text>
      {quote.source ? (
        <Text style={[typography.caption, { marginTop: 8 }]}>
          — {quote.source}
        </Text>
      ) : null}
    </Card>
  );
}
