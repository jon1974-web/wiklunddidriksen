import React from 'react';
import Svg, { Rect, Line, Path, Circle, Polygon, Polyline, Ellipse } from 'react-native-svg';

interface AppIconProps {
  name: 'calendar' | 'utensils' | 'chat' | 'compass' | 'person' | 'birthday' | 'shopping' | 'transport' | 'hotel' | 'activities' | 'destination' | 'packing' | 'links' | 'documents' | 'weather' | 'currency' | 'fly' | 'train' | 'car' | 'boat' | 'ferry' | 'taxi' | 'menu' | 'house' | 'medication' | 'vaccination' | 'allergy' | 'growth' | 'pet' | 'camera' | 'image' | 'phone' | 'email';
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

  if (name === 'birthday') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <Circle cx="12" cy="7" r="4" fill={color}/>
      <Rect x="10" y="0" width="4" height="4" rx="2" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'shopping') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" fill={color} fillOpacity="0.15"/>
      <Line x1="3" y1="6" x2="21" y2="6"/>
      <Path d="M16 10a4 4 0 01-8 0"/>
    </Svg>
  );

  if (name === 'transport') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.15"/>
      <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'hotel') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 21h18"/>
      <Path d="M5 21V7l8-4v18" fill={color} fillOpacity="0.15"/>
      <Path d="M19 21V11l-6-4"/>
      <Rect x="8" y="8" width="4" height="4" rx="1" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'activities') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.15"/>
      <Circle cx="12" cy="12" r="6" fill="none"/>
      <Circle cx="12" cy="12" r="2" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'destination') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" fill={color} fillOpacity="0.15"/>
      <Circle cx="12" cy="9" r="2.5" fill={color} stroke="none"/>
    </Svg>
  );

  if (name === 'packing') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="7" width="20" height="14" rx="2" fill={color} fillOpacity="0.15"/>
      <Path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
      <Line x1="6" y1="12" x2="10" y2="12"/>
      <Line x1="6" y1="16" x2="10" y2="16"/>
    </Svg>
  );

  if (name === 'links') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none"/>
      <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill={color} fillOpacity="0.15"/>
    </Svg>
  );

  if (name === 'documents') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill={color} fillOpacity="0.15"/>
      <Polyline points="14 2 14 8 20 8"/>
      <Line x1="16" y1="13" x2="8" y2="13"/>
      <Line x1="16" y1="17" x2="8" y2="17"/>
    </Svg>
  );

  if (name === 'weather') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="4" fill={color}/>
      <Line x1="12" y1="2" x2="12" y2="4"/>
      <Line x1="12" y1="20" x2="12" y2="22"/>
      <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
      <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
      <Line x1="2" y1="12" x2="4" y2="12"/>
      <Line x1="20" y1="12" x2="22" y2="12"/>
      <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>
      <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
    </Svg>
  );

  if (name === 'currency') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.15"/>
      <Line x1="12" y1="6" x2="12" y2="18"/>
      <Path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5"/>
    </Svg>
  );

  // Style A: Bold stroke with filled accent background
  if (name === 'fly') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13"/>
      <Path d="M22 2l-7 20-4-9-9-4z" fill={color} fillOpacity="0.15"/>
    </Svg>
  );

  if (name === 'train') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="3" width="16" height="16" rx="2" fill={color} fillOpacity="0.15"/>
      <Line x1="4" y1="11" x2="20" y2="11"/>
      <Line x1="12" y1="3" x2="12" y2="11"/>
      <Circle cx="8" cy="15" r="1" fill={color} stroke="none"/>
      <Circle cx="16" cy="15" r="1" fill={color} stroke="none"/>
      <Line x1="8" y1="19" x2="6" y2="22"/>
      <Line x1="16" y1="19" x2="18" y2="22"/>
    </Svg>
  );

  if (name === 'boat') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/>
      <Path d="M4 16l2-8h12l2 8" fill={color} fillOpacity="0.15"/>
      <Line x1="12" y1="4" x2="12" y2="8"/>
      <Path d="M10 4h4l1 4h-6l1-4z"/>
    </Svg>
  );

  if (name === 'ferry') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/>
      <Rect x="4" y="10" width="16" height="6" rx="1" fill={color} fillOpacity="0.15"/>
      <Line x1="4" y1="16" x2="4" y2="13"/>
      <Line x1="20" y1="16" x2="20" y2="13"/>
      <Circle cx="8" cy="13" r="1" fill={color} stroke="none"/>
      <Circle cx="16" cy="13" r="1" fill={color} stroke="none"/>
    </Svg>
  );

  // Style C: Bold stroke, fully filled main shape
  if (name === 'car') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 14l1.5-5.5a2 2 0 011.9-1.4h7.1a2 2 0 011.9 1.4L19 14" fill={color}/>
      <Rect x="3" y="14" width="18" height="4" rx="1" fill={color}/>
      <Circle cx="7" cy="18" r="2" fill="#fff" stroke={color} strokeWidth="2"/>
      <Circle cx="17" cy="18" r="2" fill="#fff" stroke={color} strokeWidth="2"/>
      <Line x1="7" y1="12" x2="17" y2="12" stroke="#fff" strokeWidth="2"/>
    </Svg>
  );

  if (name === 'taxi') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 14l1.5-5.5a2 2 0 011.9-1.4h7.1a2 2 0 011.9 1.4L19 14" fill={color}/>
      <Rect x="3" y="14" width="18" height="4" rx="1" fill={color}/>
      <Circle cx="7" cy="18" r="2" fill="#fff" stroke={color} strokeWidth="2"/>
      <Circle cx="17" cy="18" r="2" fill="#fff" stroke={color} strokeWidth="2"/>
      <Line x1="7" y1="12" x2="17" y2="12" stroke="#fff" strokeWidth="2"/>
      <Rect x="10" y="7" width="4" height="3" rx="1" fill="#fff" stroke="none"/>
    </Svg>
  );

  if (name === 'menu') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="4" y1="6" x2="20" y2="6"/>
      <Line x1="4" y1="12" x2="16" y2="12"/>
      <Line x1="4" y1="18" x2="12" y2="18"/>
      <Circle cx="18" cy="12" r="1.5" fill={color}/>
      <Circle cx="14" cy="18" r="1.5" fill={color}/>
    </Svg>
  );

  if (name === 'house') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <Polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  );

  if (name === 'medication') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </Svg>
  );

  if (name === 'vaccination') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 21h10"/>
      <Rect x="10" y="9" width="4" height="12" rx="1"/>
      <Path d="M12 9V3a1 1 0 00-1-1H9a1 1 0 00-1 1v6"/>
      <Path d="M12 9V3a1 1 0 011-1h2a1 1 0 011 1v6"/>
      <Line x1="12" y1="3" x2="12" y2="9"/>
    </Svg>
  );

  if (name === 'allergy') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <Line x1="12" y1="9" x2="12" y2="13"/>
      <Line x1="12" y1="17" x2="12.01" y2="17"/>
    </Svg>
  );

  if (name === 'growth') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20V10"/>
      <Path d="M18 20V4"/>
      <Path d="M6 20v-4"/>
    </Svg>
  );

  if (name === 'pet') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="8" cy="7" r="2.5"/>
      <Circle cx="16" cy="7" r="2.5"/>
      <Circle cx="5" cy="13" r="2"/>
      <Circle cx="19" cy="13" r="2"/>
      <Ellipse cx="12" cy="18" rx="5" ry="3.5"/>
    </Svg>
  );

  if (name === 'camera') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <Circle cx="12" cy="13" r="4"/>
    </Svg>
  );

  if (name === 'image') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <Circle cx="8.5" cy="8.5" r="1.5"/>
      <Polyline points="21 15 16 10 5 21"/>
    </Svg>
  );

  if (name === 'phone') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </Svg>
  );

  if (name === 'email') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <Polyline points="22,6 12,13 2,6"/>
    </Svg>
  );

  return null;
};
