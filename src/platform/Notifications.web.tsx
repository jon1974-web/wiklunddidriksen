import { initializeApp, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
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
  } catch {
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
      // Store token in user profile for the Cloud Function
      const { auth } = await import('../services/firebase');
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
      }
    }
  } catch (error) {
    // FCM registration failed — web push not supported or blocked
  }
};

export const scheduleEventReminder = async (
  title: string,
  body: string,
  date: Date,
  reminderMinutes: number
): Promise<string | null> => {
  const triggerTime = date.getTime() - reminderMinutes * 60 * 1000;
  if (triggerTime <= Date.now()) return null;

  const delay = triggerTime - Date.now();
  const id = `web_${Date.now()}`;

  setTimeout(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`📅 ${title}`, { body });
    }
  }, delay);

  return id;
};

export const cancelNotification = async (_notificationId: string) => {
  // Web setTimeout notifications can't be canceled after they fire
};

export const cancelAllNotifications = async () => {
  // Web setTimeout notifications can't be bulk-canceled
};
