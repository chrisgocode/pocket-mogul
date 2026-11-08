import { Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { STARTUP_CONTENT_ISSUES } from '@/content';
import { AdBreakCard } from '@/features/ads/AdBreakCard';
import { GoalCelebration } from '@/features/goals/GoalCelebration';
import { ContentErrorScreen } from '@/features/startup/ContentErrorScreen';
import { ReturnSummarySheet } from '@/features/returnSummary/ReturnSummarySheet';
import { DeviceGameProvider } from '@/features/startup/DeviceGameProvider';
import { OpeningSaveScreen } from '@/features/startup/OpeningSaveScreen';
import { RecoveryNoticeSheet } from '@/features/startup/RecoveryNoticeSheet';
import { RootStack } from '@/ui/RootStack';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {STARTUP_CONTENT_ISSUES.length > 0 ? (
        <ContentErrorScreen issues={STARTUP_CONTENT_ISSUES} />
      ) : (
        <Suspense fallback={<OpeningSaveScreen />}>
          <DeviceGameProvider>
            <RootStack />
            <GoalCelebration />
            <ReturnSummarySheet />
            <RecoveryNoticeSheet />
            <AdBreakCard />
          </DeviceGameProvider>
        </Suspense>
      )}
    </SafeAreaProvider>
  );
}
