export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role?: 'admin' | 'member';
  timezone?: string;
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

export interface PackingItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface PackingList {
  id: string;
  title: string;
  items: PackingItem[];
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
  startTime?: string;
  endTime?: string;
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
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
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

export interface TripTransport {
  id: string;
  transportType?: 'fly' | 'tog' | 'bil' | 'boat' | 'taxi' | 'ferry';
  type?: 'utreise' | 'hjemreise';
  isOneWay?: boolean;
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
  departureAddress?: string;
  arrivalAddress?: string;
  driver?: string;
  passengers?: string;
  wagon?: string;
  routeName?: string;
  cabin?: string;
  hasCar?: boolean;
  carRegistration?: string;
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
  logoUrl?: string;
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
  minUkeSections?: { [key: string]: boolean };
  createdAt: number;
}

export interface FamilyMember {
  role: 'owner' | 'admin' | 'member';
  displayName: string;
}

export interface Birthday {
  id: string;
  name: string;
  date: string;
  addedBy: string;
  addedByName: string;
  familyId: string;
  createdAt: number;
}

export interface GiftIdea {
  id: string;
  birthdayId: string;
  familyId: string;
  name: string;
  purchased: boolean;
  year: number;
  createdAt: number;
}

// Pet Space Types
export interface Pet {
  id: string;
  name: string;
  type: string;
  gender?: string;
  breed?: string;
  birthday?: string;
  identification?: string;
  passportNumber?: string;
  chipId?: string;
  chipDate?: string;
  photoUrl?: string;
  familyId: string;
  createdAt: number;
}

export interface PetVetVisit {
  id: string;
  petId: string;
  familyId: string;
  title: string;
  doctor?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  note?: string;
  reminder?: string;
  notificationId?: string;
  status: 'planned' | 'completed';
  addToCalendar?: boolean;
  createdAt: number;
}

export interface PetMedication {
  id: string;
  petId: string;
  familyId: string;
  name: string;
  dosage: string;
  frequency: number;
  timeSlots: MedicationTimeSlot[];
  dateFrom?: string;
  dateTo?: string;
  note?: string;
  createdAt: number;
}

export interface PetFood {
  id: string;
  petId: string;
  familyId: string;
  name: string;
  time: string;
  amount: string;
  note?: string;
  createdAt: number;
}

export interface PetGrooming {
  id: string;
  petId: string;
  familyId: string;
  name: string;
  lastDate: string;
  nextDate?: string;
  note?: string;
  createdAt: number;
}

export interface PetVaccination {
  id: string;
  petId: string;
  familyId: string;
  name: string;
  date: string;
  nextDue?: string;
  reminder?: string;
  notificationId?: string;
  status: 'completed' | 'pending';
  note?: string;
  createdAt: number;
}

export interface PetInsurance {
  id: string;
  petId: string;
  familyId: string;
  provider: string;
  policyNumber: string;
  expiryDate: string;
  documentUrl?: string;
  note?: string;
  createdAt: number;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeTranslation {
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  time: number;
  portions: number;
  category: string;
  variation?: string;
  cuisine?: string;
  caloriesPerServing?: number;
  totalCalories?: number;
  isFavorite: boolean;
  createdBy: string;
  familyId: string;
  createdAt: number;
  translations?: {
    [lang: string]: RecipeTranslation;
  };
}

export interface MealPlan {
  id: string;
  weekStart: string;
  meals: {
    [day: string]: { frokost?: string; lunsj?: string; middag?: string };
  };
  familyId: string;
  createdBy: string;
  DAYS?: string[];
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

export interface TripSubcollections {
  flights: TripFlight[];
  hotels: TripHotel[];
  restaurants: TripRestaurant[];
  activities: TripActivity[];
  packingLists: any[];
}

// Health Space Types
export interface MedicationTimeSlot {
  time: string;
  reminderMinutes: number;
}

export interface HealthMedication {
  id: string;
  name: string;
  person: string;
  dosage: string;
  frequency: number;
  timeSlots: MedicationTimeSlot[];
  dateFrom?: string;
  dateTo?: string;
  note?: string;
  createdAt: number;
}

export interface HealthAppointment {
  id: string;
  title: string;
  person: string;
  doctor?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  note?: string;
  reminder?: string;
  addToCalendar?: boolean;
  notificationId?: string;
  createdAt: number;
}

export interface HealthVaccination {
  id: string;
  name: string;
  person: string;
  date: string;
  nextDue?: string;
  status: 'completed' | 'pending' | 'overdue';
  reminder?: string;
  location?: string;
  note?: string;
  createdAt: number;
}

export interface HealthAllergy {
  id: string;
  allergen: string;
  person: string;
  severity: 'mild' | 'moderate' | 'severe';
  note?: string;
  createdAt: number;
}

export interface HealthGrowth {
  id: string;
  person: string;
  height: number;
  weight: number;
  date: string;
  note?: string;
  createdAt: number;
}

export type HealthItemType = 'medication' | 'appointment' | 'vaccination' | 'allergy' | 'growth';

// School module types
export interface SchoolChild {
  id: string;
  name: string;
  school?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  familyId: string;
  createdAt: number;
}

export interface SchoolYear {
  id: string;
  childId: string;
  year: string;
  grade: string;
  school?: string;
  familyId: string;
  createdAt: number;
}

export interface SchoolContact {
  id: string;
  yearId: string;
  childId: string;
  name: string;
  role: 'teacher' | 'classmate' | 'admin';
  teacherType?: 'personal' | 'contact' | 'subject';
  adminType?: string[];
  subject?: string;
  phone?: string;
  email?: string;
  address?: string;
  childPhone?: string;
  childEmail?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentName2?: string;
  parentPhone2?: string;
  parentEmail2?: string;
  notes?: string;
  familyId: string;
  createdAt: number;
}

export interface SchoolSchedule {
  id: string;
  yearId: string;
  childId: string;
  semester: 'høst' | 'vår';
  imageUrl: string;
  fileName: string;
  familyId: string;
  createdAt: number;
}

export interface SchoolHoliday {
  id: string;
  yearId: string;
  childId: string;
  familyId: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  timeFrom?: string;
  timeTo?: string;
  createdAt: number;
}

export interface SchoolActivityDocument {
  url: string;
  fileName: string;
  type: 'image' | 'document';
}

export interface SchoolActivity {
  id: string;
  familyId: string;
  childId: string;
  yearId: string;
  title: string;
  activityType: 'tur' | 'aktivitet' | 'møte';
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  note?: string;
  reminder?: string;
  reminderAt?: string;
  documents?: SchoolActivityDocument[];
  createdBy?: string;
  googleCalendarEventId?: string;
  createdAt: number;
}

export interface KindergartenActivity {
  id: string;
  familyId: string;
  childId: string;
  yearId: string;
  title: string;
  activityType: 'tur' | 'aktivitet' | 'møte';
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  note?: string;
  reminder?: string;
  reminderAt?: string;
  documents?: SchoolActivityDocument[];
  createdBy?: string;
  googleCalendarEventId?: string;
  createdAt: number;
}

export interface KindergartenChild {
  id: string;
  name: string;
  kindergarten?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  familyId: string;
  createdAt: number;
}

export interface KindergartenYear {
  id: string;
  childId: string;
  year: string;
  group: string;
  kindergarten?: string;
  familyId: string;
  createdAt: number;
}

export interface KindergartenContact {
  id: string;
  yearId: string;
  childId: string;
  name: string;
  role: 'teacher' | 'child' | 'admin';
  teacherType?: 'personal' | 'contact' | 'subject';
  adminType?: string[];
  subject?: string;
  phone?: string;
  email?: string;
  address?: string;
  childPhone?: string;
  childEmail?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentName2?: string;
  parentPhone2?: string;
  parentEmail2?: string;
  notes?: string;
  familyId: string;
  createdAt: number;
}

export interface KindergartenSchedule {
  id: string;
  yearId: string;
  childId: string;
  semester: 'høst' | 'vår';
  imageUrl: string;
  fileName: string;
  familyId: string;
  createdAt: number;
}
