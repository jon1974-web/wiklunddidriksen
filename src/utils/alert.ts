import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
};

export const crossAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
      return;
    }
    const hasDestructive = buttons.some((b) => b.style === 'destructive');
    const msg = `${title}\n\n${message}\n\n${hasDestructive ? '(Trykk OK for å bekrefte, Avbryt for å avbryte)' : ''}`;
    const result = window.confirm(msg);
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtn = buttons.find((b) => b.style === 'destructive' || b.style === 'default');
    if (result && actionBtn?.onPress) {
      actionBtn.onPress();
    } else if (!result && cancelBtn?.onPress) {
      cancelBtn.onPress();
    }
    return;
  }
  Alert.alert(title, message, buttons);
};
