export const sanitizeInput = (input: string, maxLen = 500): string =>
  input.trim().slice(0, maxLen).replace(/[<>]/g, '');

export const getErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code.includes('auth/user-not-found')) return 'Bruker ikke funnet';
  if (code.includes('auth/wrong-password')) return 'Feil passord';
  if (code.includes('auth/email-already-in-use')) return 'E-posten er allerede i bruk';
  if (code.includes('auth/invalid-email')) return 'Ugyldig e-postadresse';
  if (code.includes('auth/weak-password')) return 'Passordet er for svakt';
  if (code.includes('auth/too-many-requests')) return 'For mange forsøk. Prøv igjen senere';
  if (code.includes('permission-denied')) return 'Du har ikke tilgang til denne handlingen';
  if (code.includes('not-found')) return 'Ressursen ble ikke funnet';
  if (code.includes('already-exists')) return 'Ressursen finnes allerede';

  return 'Noe gikk galt. Prøv igjen.';
};
