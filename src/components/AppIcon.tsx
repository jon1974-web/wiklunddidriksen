import React from 'react';
import Svg, { Rect, Line, Path, Circle, Polygon } from 'react-native-svg';

interface AppIconProps {
  name: 'calendar' | 'utensils' | 'chat' | 'compass' | 'person';
  size?: number;
  color?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, size = 24, color = '#0097A7' }) => {
  if (name === 'calendar') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <Line x1="16" y1="2" x2="16" y2="6"/>
      <Line x1="8" y1="2" x2="8" y2="6"/>
      <Line x1="3" y1="10" x2="21" y2="10"/>
      <Rect x="7" y="13" width="4" height="4" rx="1" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'utensils') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <Line x1="7" y1="2" x2="7" y2="22"/>
      <Path d="M17 2c0 0 0 5 0 7 0 1.1-.9 2-2 2h-1v11"/>
      <Line x1="14" y1="2" x2="14" y2="22"/>
    </Svg>
  );

  if (name === 'chat') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </Svg>
  );

  if (name === 'compass') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10"/>
      <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'person') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <Circle cx="12" cy="7" r="4"/>
    </Svg>
  );

  return null;
};
