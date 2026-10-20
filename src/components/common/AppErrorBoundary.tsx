import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('AppErrorBoundary caught an error', error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView
          className="flex-1"
          style={{ backgroundColor: colors.background }}
        >
          <View className="flex-1 items-center justify-center px-6">
            <Text style={[typography.title, { textAlign: 'center', marginBottom: 12 }]}>
              משהו השתבש
            </Text>
            <Text
              style={[
                typography.body,
                { textAlign: 'center', marginBottom: 24, color: colors.muted },
              ]}
            >
              האפליקציה נתקלה בשגיאה בלתי צפויה. נסו לטעון מחדש.
            </Text>
            {__DEV__ && this.state.error ? (
              <Text
                style={[
                  typography.caption,
                  {
                    textAlign: 'center',
                    marginBottom: 24,
                    color: colors.error,
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {this.state.error.message}
              </Text>
            ) : null}
            <Pressable
              onPress={this.handleRetry}
              accessibilityRole="button"
              className="rounded-xl px-6 py-3"
              style={{ backgroundColor: colors.primary }}
            >
              <Text style={{ color: colors.white, fontWeight: '700' }}>נסו שוב</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
