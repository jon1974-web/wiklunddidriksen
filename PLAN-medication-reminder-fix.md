# PLAN — Medication Reminder Fix

## Issue
After the latest fix, medication reminders only sent once. Should be sent daily.

## Status
- Started working after timezone fix
- Only got one reminder per medication
- Should repeat daily based on medication time slots

## Next Steps
1. Check `checkMedicationReminders` Cloud Function in `functions/index.js`
2. Verify the reminder scheduling logic — is it checking each day or just once?
3. Check if the `nextReminderAt` field is being updated after each send
4. Check the 30-minute window logic — is it too narrow?
5. Test with a medication that has a time slot for today

## Notes
- Medication reminders use `checkMedicationReminders` scheduled function
- Each medication has `timeSlots` with `time` and `reminderMinutes`
- The function checks every minute and sends if within the reminder window
- After sending, it should update `nextReminderAt` to avoid re-sending
