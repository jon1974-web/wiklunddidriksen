// Helper to generate a theme from an accent color
function makeTheme(accent: string) {
  // Generate a light background tint from the accent color
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const bgR = Math.round(r * 0.06 + 245 * 0.94);
  const bgG = Math.round(g * 0.06 + 247 * 0.94);
  const bgB = Math.round(b * 0.06 + 249 * 0.94);
  const bg = `#${Math.round(bgR).toString(16).padStart(2, '0')}${Math.round(bgG).toString(16).padStart(2, '0')}${Math.round(bgB).toString(16).padStart(2, '0')}`;
  const lightR = Math.round(r * 0.15 + 255 * 0.85);
  const lightG = Math.round(g * 0.15 + 255 * 0.85);
  const lightB = Math.round(b * 0.15 + 255 * 0.85);
  const accentLight = `#${Math.round(lightR).toString(16).padStart(2, '0')}${Math.round(lightG).toString(16).padStart(2, '0')}${Math.round(lightB).toString(16).padStart(2, '0')}`;
  const borderR = Math.round(r * 0.3 + 200 * 0.7);
  const borderG = Math.round(g * 0.3 + 200 * 0.7);
  const borderB = Math.round(b * 0.3 + 200 * 0.7);
  const border = `#${Math.round(borderR).toString(16).padStart(2, '0')}${Math.round(borderG).toString(16).padStart(2, '0')}${Math.round(borderB).toString(16).padStart(2, '0')}`;
  const chatBgR = Math.round(r * 0.25 + 220 * 0.75);
  const chatBgG = Math.round(g * 0.25 + 220 * 0.75);
  const chatBgB = Math.round(b * 0.25 + 220 * 0.75);
  const chatBg = `#${Math.round(chatBgR).toString(16).padStart(2, '0')}${Math.round(chatBgG).toString(16).padStart(2, '0')}${Math.round(chatBgB).toString(16).padStart(2, '0')}`;

  return {
    background: bg,
    surface: '#fff',
    surfaceVariant: accentLight,
    text: '#333',
    textSecondary: '#666',
    textDisabled: '#999',
    border,
    accent,
    accentLight,
    danger: '#ff4444',
    chatBubbleOwn: accent,
    chatBubbleOther: chatBg,
    chatTextOwn: '#fff',
    chatTextOther: '#333',
    inputBackground: bg,
    statusBar: 'dark' as const,
  };
}

export const lightColors = makeTheme('#3b5a75');
export const slateGrayColors = makeTheme('#3b5a75');
export const dustyRoseColors = makeTheme('#A37B85');
export const schoolColors = makeTheme('#6B8F71');
export const kindergartenColors = makeTheme('#E8836A');
export const tripsColors = makeTheme('#7EC8E3');
export const birthdaysColors = makeTheme('#E6A817');
export const petsColors = makeTheme('#9B7DB8');
export const mealsColors = makeTheme('#E8906C');
export const healthColors = makeTheme('#C67B5C');

export const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceVariant: '#2c2c2e',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textDisabled: '#666',
  border: '#333',
  accent: '#3b5a75',
  accentLight: '#1b3a4a',
  danger: '#ff6b6b',
  chatBubbleOwn: '#3b5a75',
  chatBubbleOther: '#2c2c2e',
  chatTextOwn: '#fff',
  chatTextOther: '#e0e0e0',
  inputBackground: '#2c2c2e',
  statusBar: 'light' as const,
};

export type Colors = typeof lightColors;
