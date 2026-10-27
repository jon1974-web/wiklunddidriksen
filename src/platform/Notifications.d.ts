// Type declarations for the platform-specific Notifications module.
// Implementations: Notifications.native.tsx (expo-notifications), Notifications.web.tsx (FCM / Web Notification API)
export declare const configureNotifications: () => void;
export declare const requestNotificationPermission: () => Promise<boolean>;
export declare const scheduleEventReminder: (
  title: string,
  body: string,
  date: Date,
  reminderMinutes: number
) => Promise<string | null>;
export declare const cancelNotification: (notificationId: string) => Promise<void>;
export declare const cancelAllNotifications: () => Promise<void>;
