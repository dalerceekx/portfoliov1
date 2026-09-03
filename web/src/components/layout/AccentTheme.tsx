import { useEffect } from 'react';
import { hexToRgbChannels } from '../../utils/format';

/**
 * Applies the admin-chosen accent colours as CSS custom properties. Only two
 * validated hex values ever reach the DOM — the panel cannot inject CSS.
 */
export function AccentTheme({ primary, secondary }: { primary: string; secondary: string }) {
  useEffect(() => {
    const p = hexToRgbChannels(primary);
    const s = hexToRgbChannels(secondary);
    if (p) document.documentElement.style.setProperty('--accent-primary', p);
    if (s) document.documentElement.style.setProperty('--accent-secondary', s);
  }, [primary, secondary]);

  return null;
}
