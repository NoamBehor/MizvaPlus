import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import type { PodcastDownloadState } from '@/types/podcast';

interface PodcastDownloadButtonProps {
  downloadState: PodcastDownloadState;
  isOfflineAvailable: boolean;
  downloadError?: string | null;
  onDownload: () => void;
  onRemoveDownload: () => void;
  disabled?: boolean;
}

function getDownloadLabel(
  downloadState: PodcastDownloadState,
  isOfflineAvailable: boolean,
): string {
  if (isOfflineAvailable || downloadState === 'downloaded') {
    return 'זמין אופליין';
  }

  switch (downloadState) {
    case 'downloading':
      return 'מוריד…';
    case 'failed':
      return 'נסה שוב';
    case 'unavailable':
      return 'הורדה לא זמינה בדפדפן';
    default:
      return 'הורד להאזנה אופליין';
  }
}

function getDownloadAccessibilityLabel(
  downloadState: PodcastDownloadState,
  isOfflineAvailable: boolean,
): string {
  if (isOfflineAvailable || downloadState === 'downloaded') {
    return 'הפרק זמין להאזנה אופליין';
  }

  if (downloadState === 'downloading') {
    return 'מוריד את הפרק להאזנה אופליין';
  }

  if (downloadState === 'failed') {
    return 'נסה שוב להוריד את הפרק להאזנה אופליין';
  }

  return 'הורד את הפרק להאזנה אופליין';
}

export function PodcastDownloadButton({
  downloadState,
  isOfflineAvailable,
  onDownload,
  onRemoveDownload,
  downloadError = null,
  disabled = false,
}: PodcastDownloadButtonProps) {
  const isDownloaded = isOfflineAvailable || downloadState === 'downloaded';
  const isDownloading = downloadState === 'downloading';
  const label = getDownloadLabel(downloadState, isOfflineAvailable);
  const accessibilityLabel = getDownloadAccessibilityLabel(
    downloadState,
    isOfflineAvailable,
  );

  return (
    <View>
      <Pressable
        onPress={() => {
          if (isDownloaded) {
            onRemoveDownload();
            return;
          }

          onDownload();
        }}
        disabled={disabled || isDownloading || downloadState === 'unavailable'}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: isDownloaded ? colors.surface : colors.primary,
          borderWidth: 1,
          borderColor: isDownloaded ? colors.border : colors.primary,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || isDownloading ? 0.6 : 1,
        }}
      >
        <Text
          style={[
            typography.label,
            { color: isDownloaded ? colors.text : colors.white },
          ]}
        >
          {isDownloaded ? '✓ ' : downloadState === 'failed' ? '↻ ' : '↓ '}
          {label}
        </Text>
      </Pressable>

      {downloadState === 'unavailable' ? (
        <Text
          style={[
            typography.caption,
            { color: colors.muted, marginTop: spacing.xs, textAlign: 'right' },
          ]}
        >
          הורדה אופליין זמינה רק באפליקציה לנייד
        </Text>
      ) : null}

      {downloadError && downloadState === 'failed' ? (
        <Text
          style={[
            typography.caption,
            {
              color: colors.error,
              marginTop: spacing.xs,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {downloadError}
        </Text>
      ) : null}
    </View>
  );
}
