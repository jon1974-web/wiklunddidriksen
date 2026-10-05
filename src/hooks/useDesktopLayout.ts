import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * True when the web app runs as an installed PWA (standalone window)
 * rather than in a regular browser tab. Uses the standard
 * `display-mode: standalone` media query plus the iOS Safari
 * `navigator.standalone` property.
 */
export function useStandaloneMode(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let mq: MediaQueryList | null = null;
    const update = () => {
      try {
        const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
        setStandalone(iosStandalone || (mq ? mq.matches : false));
      } catch {
        setStandalone(false);
      }
    };
    try {
      mq = window.matchMedia('(display-mode: standalone)');
      update();
      mq.addEventListener?.('change', update);
    } catch {
      update();
    }
    return () => {
      mq?.removeEventListener?.('change', update);
    };
  }, []);

  return standalone;
}

export const DESKTOP_MIN_WIDTH = 1100;

/**
 * The browser/desktop experience (top tab bar + side panels) is shown only when:
 *  - running on web (native apps are never affected)
 *  - NOT installed as a standalone PWA (installed PWA always gets the phone app)
 *  - window is at least DESKTOP_MIN_WIDTH wide (phones/tablet browsers unchanged)
 */
export function useDesktopLayout() {
  const { width } = useWindowDimensions();
  const standalone = useStandaloneMode();
  const isDesktop = Platform.OS === 'web' && !standalone && width >= DESKTOP_MIN_WIDTH;
  return { isDesktop, standalone, width };
}
