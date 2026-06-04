export const configureNotifications = () => {
  // Web notifications require service worker setup — stub for now
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
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
