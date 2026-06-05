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
