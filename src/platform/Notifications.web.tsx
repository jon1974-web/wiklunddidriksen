import { initializeApp, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

let messaging: any = null;

const initMessaging = () => {
  try {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator)) return null;
    if (messaging) return messaging;

    const app = getApp();
    messaging = getMessaging(app);
    return messaging;
  } catch (e) {
    console.log('[Notifications] initMessaging failed:', e);
    return null;
  }
};

export const configureNotifications = () => {
  const m = initMessaging();
  if (!m) return;

  // Listen for foreground messages
  onMessage(m, (payload) => {
    if (payload.notification) {
      new Notification(payload.notification.title || 'Familiesenter', {
        body: payload.notification.body,
        icon: '/favicon.ico',
      });
    }
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') {
    await registerFcmToken();
    return true;
  }
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await registerFcmToken();
    return true;
  }
  return false;
};

const registerFcmToken = async () => {
  try {
    const m = initMessaging();
    if (!m) return;

    const token = await getToken(m, {
      vapidKey: 'BPwXjaC9BQLFaOOVfAmQBretc3xYQ154HMmaPbCnuljuT-TG7t3w0CsJID2SjqTYxa3z_LGqW8_5LzjPjGqeKMQ',
    });

    if (token) {
      const { auth } = await import('../services/firebase');
      const user = auth.currentUser;
      if (user) {
        // Check if token has changed
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const currentToken = userDoc.data()?.fcmToken;
        if (currentToken !== token) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
          console.log('[Notifications] FCM token updated');
        }
      }
    }
  } catch (error) {
    console.log('[Notifications] FCM registration failed:', error);
  }
};

export const scheduleEventReminder = async (
  _title: string,
  _body: string,
  _date: Date,
  _reminderMinutes: number
): Promise<string | null> => {
  // FCM via checkReminders Cloud Function handles all reminders for web
  // Local setTimeout caused duplicate notifications
  return null;
};

export const cancelNotification = async (_notificationId: string) => {
  // Web setTimeout notifications can't be canceled after they fire
};

export const cancelAllNotifications = async () => {
  // Web setTimeout notifications can't be bulk-canceled
};
