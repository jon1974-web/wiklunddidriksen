export const REMINDER_OPTIONS = [
  { label: '15 minutter', value: 15 },
  { label: '30 minutter', value: 30 },
  { label: '1 time', value: 60 },
  { label: '2 timer', value: 120 },
  { label: '1 dag', value: 1440 },
];

export const END_DATE_OPTIONS = [
  { label: '1 dag', value: 1 },
  { label: '2 dager', value: 2 },
  { label: '3 dager', value: 3 },
  { label: '4 dager', value: 4 },
];

export const END_TIME_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 time', value: 60 },
  { label: '1.5 timer', value: 90 },
  { label: '2 timer', value: 120 },
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
