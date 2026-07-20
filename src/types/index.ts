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
  familyId?: string | null;
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

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  uvIndex: number;
  waterTemp?: number;
}

export interface DestinationTips {
  overview: string;
  thingsToDo: string[];
  restaurants: string[];
  localPhrases: { no: string; local: string; pronunciation: string }[];
  transportTips: string[];
  scamWarnings: string[];
  generatedAt: string;
}

export interface CityTips {
  city: string;
  tips: DestinationTips;
}

export interface Trip {
  id: string;
  title: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  icon?: string;
  latitude?: number;
  longitude?: number;
  weatherSummary?: WeatherDay[];
  destinationTips?: CityTips[];
  createdBy: string;
  createdAt: number;
}

export interface TripRestaurant {
  id: string;
  name?: string;
  address?: string;
  note?: string;
  createdAt: number;
}

export interface TripActivity {
  id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
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
  name?: string;
  address?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
  createdAt: number;
}

export interface TripFlight {
  id: string;
  transportType?: 'fly' | 'tog' | 'bil';
  type?: 'utreise' | 'hjemreise';
  airline?: string;
  flightNumber?: string;
  reference?: string;
  seatNumber?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  phone?: string;
  note?: string;
  address?: string;
  driver?: string;
  passengers?: string;
  wagon?: string;
  createdAt: number;
}

export interface TripBoat {
  id: string;
  name?: string;
  routeName?: string;
  reference?: string;
  cabin?: string;
  isOneWay?: boolean;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureAddress?: string;
  arrivalAddress?: string;
  phone?: string;
  hasCar?: boolean;
  carRegistration?: string;
  driver?: string;
  passengers?: string;
  note?: string;
  createdAt: number;
}

export interface TripTaxi {
  id: string;
  name?: string;
  reference?: string;
  departureDate?: string;
  departureTime?: string;
  address?: string;
  phone?: string;
  driver?: string;
  passengers?: string;
  note?: string;
  createdAt: number;
}

export interface TripFerry {
  id: string;
  name?: string;
  routeName?: string;
  reference?: string;
  cabin?: string;
  isOneWay?: boolean;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureAddress?: string;
  arrivalAddress?: string;
  phone?: string;
  hasCar?: boolean;
  carRegistration?: string;
  driver?: string;
  passengers?: string;
  note?: string;
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  familyId: string | null;
  familyName: string | null;
  familyRole?: 'owner' | 'admin' | 'member';
  calendarId: string | null;
  calendarEmail: string | null;
  calendarProvider: 'google' | 'outlook' | null;
  avatarUrl: string | null;
  notificationsEnabled: boolean;
  createdAt: number;
}

export interface FamilyMember {
  role: 'owner' | 'admin' | 'member';
  displayName: string;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  members: { [uid: string]: FamilyMember };
  inviteCode?: string;
  inviteCreatedAt?: number;
  inviteExpiresAt?: number;
  createdAt: number;
}
