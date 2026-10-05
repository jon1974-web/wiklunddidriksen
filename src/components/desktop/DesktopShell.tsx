import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface DesktopShellProps {
  isDesktop: boolean;
  topTabBar?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
}

export const APP_COLUMN_WIDTH = 500;
export const PANEL_WIDTH = 340;

/**
 * Browser-only 3-column showcase shell:
 *   [left panel: why] [app column: the app, unchanged] [right panel: how + ads]
 *
 * When isDesktop is false (native apps, installed PWA, window < 1100px)
 * this renders ONLY the children — the app is pixel-identical to today.
 */
export const DesktopShell: React.FC<DesktopShellProps> = ({
  isDesktop,
  topTabBar,
  leftPanel,
  rightPanel,
  children,
}) => {
  const { colors } = useTheme();

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {leftPanel}
      </ScrollView>

      <View
        style={[
          styles.appColumn,
          { backgroundColor: colors.surface },
          Platform.OS === 'web' && { boxShadow: '0 8px 40px rgba(0, 40, 50, 0.10)' } as any,
        ]}
      >
        {topTabBar}
        <View style={styles.appBody}>{children}</View>
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {rightPanel}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 24,
    paddingHorizontal: 26,
    paddingVertical: 20,
  },
  panel: {
    width: PANEL_WIDTH,
    flexShrink: 0,
  },
  panelContent: {
    paddingBottom: 28,
  },
  appColumn: {
    width: APP_COLUMN_WIDTH,
    flexShrink: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },
  appBody: {
    flex: 1,
  },
});
