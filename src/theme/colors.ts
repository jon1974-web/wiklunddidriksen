export const lightColors = {
  background: '#f5f5f5',
  surface: '#fff',
  surfaceVariant: '#f0f0f0',
  text: '#333',
  textSecondary: '#666',
  textDisabled: '#999',
  border: '#eee',
  accent: '#4CAF50',
  accentLight: '#E8F5E9',
  danger: '#ff4444',
  chatBubbleOwn: '#4CAF50',
  chatBubbleOther: '#e5e5ea',
  chatTextOwn: '#fff',
  chatTextOther: '#000',
  inputBackground: '#f5f5f5',
  statusBar: 'dark',
} as const;

export const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceVariant: '#2c2c2e',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textDisabled: '#666',
  border: '#333',
  accent: '#4CAF50',
  accentLight: '#1b3a1e',
  danger: '#ff6b6b',
  chatBubbleOwn: '#4CAF50',
  chatBubbleOther: '#2c2c2e',
  chatTextOwn: '#fff',
  chatTextOther: '#e0e0e0',
  inputBackground: '#2c2c2e',
  statusBar: 'light',
} as const;

export type Colors = typeof lightColors;
