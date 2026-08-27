import i18n from '../i18n';
import { REMINDER_OPTIONS } from './reminderOptions';

export const getReminderOptions = () => REMINDER_OPTIONS.map(o => ({
  label: o.value === 0 ? i18n.t('health.noReminder') : `${o.label}`,
  value: o.value,
}));

export const getEndDateOptions = () => [
  { label: i18n.t('events.endDate1'), value: 1 },
  { label: i18n.t('events.endDate2'), value: 2 },
  { label: i18n.t('events.endDate3'), value: 3 },
  { label: i18n.t('events.endDate4'), value: 4 },
];

export const getEndTimeOptions = () => [
  { label: i18n.t('events.endTime30'), value: 30 },
  { label: i18n.t('events.endTime60'), value: 60 },
  { label: i18n.t('events.endTime90'), value: 90 },
  { label: i18n.t('events.endTime120'), value: 120 },
];

export const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push({
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      });
    }
  }
  return times;
};

export const TIME_OPTIONS = generateTimeOptions();
