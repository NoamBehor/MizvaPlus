import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { typography } from '@/constants/theme';
import { useCountdownPlaceholder } from '@/hooks/useCountdownPlaceholder';
import { getNextEventPlaceholder } from '@/utils/hebrewDate';

export function CountdownCard() {
  const countdown = useCountdownPlaceholder();

  return (
    <Card className="mb-4 items-center">
      <Text style={typography.caption}>האירוע הבא · {getNextEventPlaceholder()}</Text>
      <Text style={typography.countdown}>{countdown}</Text>
    </Card>
  );
}
