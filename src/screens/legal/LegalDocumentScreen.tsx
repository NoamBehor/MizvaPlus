import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { legalDocuments } from '@/constants/legal';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';

type LegalDocumentScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'LegalDocument'
>;

export function LegalDocumentScreen({ route }: LegalDocumentScreenProps) {
  const document = legalDocuments[route.params.document];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={typography.hero}>{document.title}</Text>
        {document.paragraphs.map((paragraph) => (
          <View key={paragraph} style={{ marginTop: spacing.md }}>
            <Text
              style={[
                typography.body,
                { color: colors.text, writingDirection: 'rtl', textAlign: 'right' },
              ]}
            >
              {paragraph}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
