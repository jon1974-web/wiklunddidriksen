export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role?: 'admin' | 'member';
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  address?: string;
  date: string;
  endDate?: string;
  time: string;
  endTime?: string;
  reminderMinutes: number;
  createdBy: string;
  createdAt: number;
  notificationId?: string;
  calendarEventId?: string;
  icon?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  title: string;
  items: ShoppingItem[];
  createdBy: string;
  createdAt: number;
}

export interface MessageReaction {
  userId: string;
  type: 'like' | 'smile' | 'heart';
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  timestamp: number;
  imageUrl?: string;
  reactions?: MessageReaction[];
}

export interface Trip {
  id: string;
  title: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: number;
}

export interface TripRestaurant {
  id: string;
  name: string;
  address?: string;
  note?: string;
  rating?: number;
  createdAt: number;
}

export interface TripActivity {
  id: string;
  name: string;
  date?: string;
  time?: string;
  address?: string;
  note?: string;
  createdAt: number;
}

export interface TripDocument {
  id: string;
  title: string;
  note?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: number;
}

export interface TripLink {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface TripHotel {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: number;
}

export interface SpondEvent {
  id: string;
  heading: string;
  description?: string;
  startTimestamp: string;
  endTimestamp?: string;
  address?: string;
  groupName?: string;
  groupId?: string;
  responses?: {
    acceptedIds: string[];
    declinedIds: string[];
    unansweredIds: string[];
  };
}

export interface SpondGroup {
  id: string;
  name: string;
}

export interface SpondConfig {
  email: string;
  password: string;
  groups: SpondGroup[];
  respondents?: SpondRespondent[];
}

export interface SpondRespondent {
  uid: string;
  spondId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  groupId: string;
  groupName: string;
  childId?: string;
}

export interface SpondMember {
  id: string;
  firstName: string;
  lastName: string;
  profileId?: string;
  childId?: string;
}

export interface SpondGroupMember {
  id: string;
  firstName: string;
  lastName: string;
  groupId: string;
  groupName: string;
  profileId?: string;
  childId?: string;
}
